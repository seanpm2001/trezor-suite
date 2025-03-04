import { BigNumber, BigNumberValue } from '@trezor/utils/src/bigNumber';
import {
    AccountInfo,
    AccountAddresses,
    AccountAddress,
    AccountTransaction,
    AccountUtxo,
    PrecomposedTransactionFinalCardano,
    TokenTransfer,
    TokenInfo,
    DeviceState,
    StaticSessionId,
} from '@trezor/connect';
import { arrayDistinct, bufferUtils } from '@trezor/utils';
import {
    type NetworkFeature,
    type NetworkSymbol,
    type NetworkType,
    networks,
    type AccountType,
    type Bip43Path,
    type Bip43PathTemplate,
    getNetwork,
    type NetworkSymbolExtended,
    networkSymbolCollection,
} from '@suite-common/wallet-config';
import {
    Account,
    Discovery,
    PrecomposedTransactionFinal,
    ReceiveInfo,
    TokenAddress,
    GeneralPrecomposedTransactionFinal,
    RatesByKey,
} from '@suite-common/wallet-types';
import { FiatCurrencyCode } from '@suite-common/suite-config';
import { TrezorDevice } from '@suite-common/suite-types';
import {
    HELP_CENTER_ADDRESSES_URL,
    HELP_CENTER_COINJOIN_URL,
    HELP_CENTER_TAPROOT_URL,
} from '@trezor/urls';
import { formatTokenSymbol } from '@trezor/blockchain-link-utils';

import { toFiatCurrency } from './fiatConverterUtils';
import { getFiatRateKey } from './fiatRatesUtils';
import { getAccountTotalStakingBalance } from './ethereumStakingUtils';
import { isRbfTransaction } from './transactionUtils';

export const isUtxoBased = (account: Account) =>
    account.networkType === 'bitcoin' || account.networkType === 'cardano';

export const getFirstFreshAddress = (
    account: Account,
    receiveAddresses: ReceiveInfo[],
    pendingAddresses: string[],
    utxoBasedAccount: boolean,
) => {
    const unused = account.addresses
        ? account.addresses.unused
        : [
              {
                  path: account.path,
                  address: account.descriptor,
                  transfers: account.history.total,
              },
          ];

    const unrevealed = unused.filter(
        a =>
            !receiveAddresses.find(r => r.path === a.path) &&
            !pendingAddresses.find(p => p === a.address),
    );

    // const addressLabel = utxoBasedAccount ? 'RECEIVE_ADDRESS_FRESH' : 'RECEIVE_ADDRESS';
    // NOTE: unrevealed[0] can be undefined (limit exceeded)
    const firstFreshAddress = utxoBasedAccount ? unrevealed[0] : unused[0];

    return firstFreshAddress;
};

/** NOTE: input addresses' paths sequence must be uninterrupted and start with 0 */
export const sortByBIP44AddressIndex = <T extends { path: string }>(
    pathBase: string,
    addresses: T[],
) => {
    const lookup = addresses.reduce<{ [path: string]: number }>((prev, _, i) => {
        prev[`${pathBase}/${i}`] = i;

        return prev;
    }, {});

    return addresses.slice().sort((a, b) => lookup[a.path] - lookup[b.path]);
};

export const parseBIP44Path = (path: string) => {
    const regEx = /m\/(\d+'?)\/(\d+'?)\/(\d+'?)\/([0,1])\/(\d+)/;
    const tokens = path.match(regEx);
    if (!tokens || tokens.length !== 6) {
        return null;
    }

    return {
        purpose: tokens[1],
        coinType: tokens[2],
        account: tokens[3],
        change: tokens[4],
        addrIndex: tokens[5],
    };
};

export const getFiatValue = (amount: string, rate: string, fixedTo = 2) => {
    const fiatValueBigNumber = new BigNumber(amount).multipliedBy(new BigNumber(rate));
    const fiatValue = fiatValueBigNumber.isNaN() ? '' : fiatValueBigNumber.toFixed(fixedTo);

    return fiatValue;
};

export const getTitleForCoinjoinAccount = (symbol: NetworkSymbolExtended) => {
    switch (symbol) {
        case 'btc':
            return 'TR_NETWORK_COINJOIN_BITCOIN';
        case 'test':
            return 'TR_NETWORK_COINJOIN_BITCOIN_TESTNET';
        case 'regtest':
            return 'TR_NETWORK_COINJOIN_BITCOIN_REGTEST';
        default:
            return 'TR_NETWORK_UNKNOWN';
    }
};

export const getTitleForNetwork = (symbol: NetworkSymbolExtended) => {
    switch (symbol) {
        case 'btc':
            return 'TR_NETWORK_BITCOIN';
        case 'test':
            return 'TR_NETWORK_BITCOIN_TESTNET';
        case 'regtest':
            return 'TR_NETWORK_BITCOIN_REGTEST';
        case 'bch':
            return 'TR_NETWORK_BITCOIN_CASH';
        case 'btg':
            return 'TR_NETWORK_BITCOIN_GOLD';
        case 'dash':
            return 'TR_NETWORK_DASH';
        case 'dgb':
            return 'TR_NETWORK_DIGIBYTE';
        case 'doge':
            return 'TR_NETWORK_DOGECOIN';
        case 'ltc':
            return 'TR_NETWORK_LITECOIN';
        case 'nmc':
            return 'TR_NETWORK_NAMECOIN';
        case 'vtc':
            return 'TR_NETWORK_VERTCOIN';
        case 'zec':
            return 'TR_NETWORK_ZCASH';
        case 'eth':
            return 'TR_NETWORK_ETHEREUM';
        case 'bnb':
            return 'TR_NETWORK_BNB';
        case 'base':
            return 'TR_NETWORK_BASE';
        case 'op':
            return 'TR_NETWORK_OP';
        case 'tsep':
            return 'TR_NETWORK_ETHEREUM_SEPOLIA';
        case 'thol':
            return 'TR_NETWORK_ETHEREUM_HOLESKY';
        case 'etc':
            return 'TR_NETWORK_ETHEREUM_CLASSIC';
        case 'xem':
            return 'TR_NETWORK_NEM';
        case 'xlm':
            return 'TR_NETWORK_STELLAR';
        case 'ada':
            return 'TR_NETWORK_CARDANO';
        case 'xtz':
            return 'TR_NETWORK_TEZOS';
        case 'xrp':
            return 'TR_NETWORK_XRP';
        case 'txrp':
            return 'TR_NETWORK_XRP_TESTNET';
        case 'tada':
            return 'TR_NETWORK_CARDANO_TESTNET';
        case 'sol':
            return 'TR_NETWORK_SOLANA_MAINNET';
        case 'dsol':
            return 'TR_NETWORK_SOLANA_DEVNET';
        case 'pol':
            return 'TR_NETWORK_POLYGON';
        default:
            return 'TR_NETWORK_UNKNOWN';
    }
};

export const getAccountTypePrefix = (path: string) => {
    if (typeof path !== 'string') return null;
    const coinType = path.split('/')[2];
    switch (coinType) {
        case `501'`: {
            return 'TR_ACCOUNT_TYPE_SOLANA_BIP44_CHANGE';
        }
        default:
            return null;
    }
};

export const getBip43Type = (path: string) => {
    if (typeof path !== 'string') return 'unknown';
    // https://github.com/bitcoin/bips/blob/master/bip-0043.mediawiki
    const bip43 = path.split('/')[1];
    switch (bip43) {
        case `86'`:
            return 'bip86';
        case `84'`:
            return 'bip84';
        case `49'`:
            return 'bip49';
        case `44'`:
            return 'bip44';
        case `1852'`:
            return 'shelley';
        case `10025'`:
            return 'slip25';
        default:
            return 'unknown';
    }
};

export const substituteBip43Path = (
    bip43PathTemplate: Bip43PathTemplate,
    accountIndex: string | number = '0',
) => bip43PathTemplate.replace('i', String(accountIndex)) as Bip43Path;

type getAccountTypeNameProps = {
    path?: Bip43PathTemplate;
    networkType?: NetworkType;
    accountType?: AccountType;
};

export const getAccountTypeName = ({ path, accountType, networkType }: getAccountTypeNameProps) => {
    if (!networkType) return null;
    if (networkType !== 'bitcoin') {
        switch (accountType?.toLowerCase()) {
            case 'ledger':
                return 'TR_ACCOUNT_TYPE_LEDGER';
            case 'legacy':
                return 'TR_ACCOUNT_TYPE_LEGACY';
            case 'normal':
                return 'TR_ACCOUNT_TYPE_DEFAULT';
        }
    } else {
        switch (accountType?.toLowerCase()) {
            case 'segwit':
                return 'TR_ACCOUNT_TYPE_SEGWIT';
            case 'taproot':
                return 'TR_ACCOUNT_TYPE_TAPROOT';
            case 'normal':
                return 'TR_ACCOUNT_TYPE_BIP84_NAME';
            case 'legacy':
                return 'TR_ACCOUNT_TYPE_LEGACY';
        }
    }
    if (!path) return null;
    const accountTypePrefix = getAccountTypePrefix(path);
    if (accountTypePrefix) return `${accountTypePrefix}_NAME` as const;
    const bip43 = getBip43Type(path);
    if (bip43 === 'bip86') return 'TR_ACCOUNT_TYPE_BIP86_NAME';
    if (bip43 === 'bip84') return 'TR_ACCOUNT_TYPE_BIP84_NAME';
    if (bip43 === 'bip49') return 'TR_ACCOUNT_TYPE_BIP49_NAME';
    if (bip43 === 'shelley') return 'TR_ACCOUNT_TYPE_SHELLEY';
    if (bip43 === 'slip25') return 'TR_ACCOUNT_TYPE_SLIP25_NAME';

    return 'TR_ACCOUNT_TYPE_BIP44_NAME';
};

export const getAccountTypeTech = (path: Bip43PathTemplate) => {
    const accountTypePrefix = getAccountTypePrefix(path);
    if (accountTypePrefix) return `${accountTypePrefix}_TECH` as const;
    const bip43 = getBip43Type(path);
    if (bip43 === 'bip86') return 'TR_ACCOUNT_TYPE_BIP86_TECH';
    if (bip43 === 'bip84') return 'TR_ACCOUNT_TYPE_BIP84_TECH';
    if (bip43 === 'bip49') return 'TR_ACCOUNT_TYPE_BIP49_TECH';
    if (bip43 === 'shelley') return 'TR_ACCOUNT_TYPE_SHELLEY';
    if (bip43 === 'slip25') return 'TR_ACCOUNT_TYPE_SLIP25_TECH';

    return 'TR_ACCOUNT_TYPE_BIP44_TECH';
};

type getAccountTypeDescProps = {
    path: Bip43PathTemplate;
    accountType?: AccountType;
    networkType?: NetworkType;
};

export const getAccountTypeDesc = ({ path, accountType, networkType }: getAccountTypeDescProps) => {
    switch (accountType?.toLowerCase()) {
        case 'ledger':
            return 'TR_ACCOUNT_TYPE_LEDGER_DESC';
        case 'legacy':
            return 'TR_ACCOUNT_TYPE_LEGACY_DESC';
    }

    switch (networkType?.toLowerCase()) {
        case 'ethereum':
            return 'TR_ACCOUNT_TYPE_NORMAL_EVM_DESC';
        case 'solana':
            return 'TR_ACCOUNT_TYPE_NORMAL_SOLANA_DESC';
        case 'cardano':
            return 'TR_ACCOUNT_TYPE_CARDANO_DESC';
        case 'ripple':
            return 'TR_ACCOUNT_TYPE_XRP_DESC';
    }

    const accountTypePrefix = getAccountTypePrefix(path);
    if (accountTypePrefix) return `${accountTypePrefix}_DESC` as const;
    const bip43 = getBip43Type(path);
    switch (bip43) {
        case 'bip86':
            return 'TR_ACCOUNT_TYPE_BIP86_DESC';
        case 'bip84':
            return 'TR_ACCOUNT_TYPE_BIP84_DESC';
        case 'bip49':
            return 'TR_ACCOUNT_TYPE_BIP49_DESC';
        case 'shelley':
            return 'TR_ACCOUNT_TYPE_SHELLEY_DESC';
        case 'slip25':
            return 'TR_ACCOUNT_TYPE_SLIP25_DESC';
    }

    return 'TR_ACCOUNT_TYPE_BIP44_DESC';
};

export const getAccountTypeUrl = (path: string) => {
    const bip43 = getBip43Type(path);
    switch (bip43) {
        case 'bip86':
            return HELP_CENTER_TAPROOT_URL;
        case 'slip25':
            return HELP_CENTER_COINJOIN_URL;
        case 'shelley':
            return undefined;
        default:
            return HELP_CENTER_ADDRESSES_URL;
    }
};

export const getAccountDecimals = (symbol: NetworkSymbol) => networks[symbol]?.decimals;

export const stripNetworkAmount = (amount: string, decimals: number) =>
    new BigNumber(amount).toFixed(decimals, 1);

export const formatAmount = (amount: BigNumberValue, decimals: number) => {
    try {
        const bAmount = new BigNumber(amount);
        if (bAmount.isNaN()) {
            throw new Error('Amount is not a number');
        }

        return bAmount.div(new BigNumber(10).exponentiatedBy(decimals)).toString(10);
    } catch {
        return '-1'; // TODO: this is definitely not correct return value
    }
};

export const amountToSmallestUnit = (amount: BigNumberValue, decimals: number) => {
    try {
        const bAmount = new BigNumber(amount);
        if (bAmount.isNaN()) {
            throw new Error('Amount is not a number');
        }

        return bAmount.times(10 ** decimals).toString(10);
    } catch {
        // TODO: return null, so we can decide how to handle missing value in caller component
        return '-1';
    }
};

export const satoshiAmountToBtc = (amount: BigNumberValue) => {
    try {
        const satsAmount = new BigNumber(amount);
        if (satsAmount.isNaN()) {
            throw new Error('Amount is not a number');
        }

        return satsAmount.times(10 ** -8).toString(10);
    } catch {
        // TODO: return null, so we can decide how to handle missing value in caller component
        return '-1';
    }
};

export const networkAmountToSmallestUnit = (amount: string | null, symbol: NetworkSymbol) => {
    if (!amount) return '0';

    const decimals = getAccountDecimals(symbol);

    if (!decimals) return amount;

    return amountToSmallestUnit(amount, decimals);
};

export const formatNetworkAmount = (
    amount: string,
    symbol: NetworkSymbol,
    withSymbol = false,
    isSatoshis?: boolean,
) => {
    const decimals = getAccountDecimals(symbol);

    if (!decimals) return amount;

    let formattedAmount = formatAmount(amount, decimals);

    if (withSymbol) {
        let formattedSymbol = symbol?.toUpperCase();

        if (isSatoshis) {
            formattedAmount = amount;
            formattedSymbol = symbol === 'btc' ? 'sat' : `sat ${symbol?.toUpperCase()}`;
        }

        return `${formattedAmount} ${formattedSymbol}`;
    }

    return formattedAmount;
};

export const formatTokenAmount = (tokenTransfer: TokenTransfer) => {
    const formattedAmount = formatAmount(tokenTransfer.amount, tokenTransfer.decimals);
    const formattedTokenSymbol = tokenTransfer.symbol?.toUpperCase();

    return formattedTokenSymbol ? `${formattedAmount} ${formattedTokenSymbol}` : formattedAmount;
};

/**
 * Sort accounts as they are defined in `networksConfig`, by two criteria:
 * - primary: by network `symbol`
 * - secondary: by `accountType`
 */
export const sortByCoin = (accounts: Account[]) =>
    accounts.sort((a, b) => {
        // primary sorting: by order of network keys
        const aSymbolIndex = networkSymbolCollection.indexOf(a.symbol);
        const bSymbolIndex = networkSymbolCollection.indexOf(b.symbol);
        if (aSymbolIndex !== bSymbolIndex) return aSymbolIndex - bSymbolIndex;

        // when it is sorted by network, sort by order of accountType keys within the same network
        const network = networks[a.symbol];
        const orderedAccountTypes = Object.keys(network.accountTypes) as AccountType[];
        const aAccountTypeIndex = orderedAccountTypes.indexOf(a.accountType);
        const bAccountTypeIndex = orderedAccountTypes.indexOf(b.accountType);

        if (aAccountTypeIndex !== bAccountTypeIndex) return aAccountTypeIndex - bAccountTypeIndex;

        // if both are same, keep the original order in `accounts`
        return a.index - b.index;
    });

export const findAccountsByNetwork = (symbol: NetworkSymbol, accounts: Account[]) =>
    accounts.filter(a => a.symbol === symbol);

export const findAccountsByDescriptor = (descriptor: string, accounts: Account[]) =>
    accounts.filter(a => a.descriptor === descriptor);

export const findAccountsByAddress = (
    networkSymbol: NetworkSymbol,
    address: string,
    accounts: Account[],
) =>
    accounts
        .filter(account => account.symbol === networkSymbol)
        .filter(a => {
            if (a.addresses) {
                return (
                    a.addresses.used.find(u => u.address === address) ||
                    a.addresses.unused.find(u => u.address === address) ||
                    a.addresses.change.find(u => u.address === address) ||
                    a.descriptor === address
                );
            }

            return a.descriptor === address;
        });

export const findAccountDevice = (account: Account, devices: TrezorDevice[]) =>
    devices.find(d => d.state?.staticSessionId === account.deviceState);

export const getAllAccounts = (
    deviceState: DeviceState | StaticSessionId | typeof undefined,
    accounts: Account[],
) => {
    if (!deviceState) return [];

    return accounts.filter(
        a =>
            (typeof deviceState === 'string'
                ? a.deviceState === deviceState
                : a.deviceState === deviceState.staticSessionId) && a.visible,
    );
};

/**
 * Returns a string used as an index to separate txs for given account inside a transactions reducer
 *
 * @param {string} descriptor
 * @param {string} symbol
 * @param {string} deviceState
 * @returns {string}
 */
export const getAccountKey = (descriptor: string, symbol: string, deviceState: string) =>
    `${descriptor}-${symbol}-${deviceState}`;

export const countUniqueCoins = (accounts: Account[]) => {
    const coins = new Set();
    accounts.forEach(acc => coins.add(acc.symbol));

    return coins.size;
};

/**
 * Clear invalid tokens and formats amounts
 *
 * @param {Account['tokens']} tokens
 * @returns {Account['tokens']}
 */
export const enhanceTokens = (tokens: Account['tokens']) => {
    if (!tokens) return [];

    return tokens.map(t => {
        const symbol = formatTokenSymbol(t.symbol || t.contract);

        return {
            ...t,
            name: t.name || symbol,
            symbol: symbol.toLowerCase(),
            balance: formatAmount(t.balance || 0, t.decimals),
        };
    });
};

const countAddressTransfers = (transactions: AccountTransaction[]) =>
    transactions
        .flatMap(tx =>
            tx.details.vin
                .concat(tx.details.vout)
                .flatMap(({ addresses }) => addresses ?? [])
                .filter(arrayDistinct),
        )
        .reduce(
            (transfers, address) => ({ ...transfers, [address]: (transfers[address] ?? 0) + 1 }),
            {} as { [address: string]: number },
        );

export const enhanceAddresses = (
    { addresses, history: { transactions = [] }, page }: AccountInfo,
    {
        networkType,
        index: accountIndex,
        addresses: oldAddresses,
    }: Pick<Account, 'networkType' | 'index' | 'addresses'>,
): AccountAddresses | undefined => {
    // Addresses used in Suite include full derivation path including account index.
    // These addresses are derived on a backend (Blockbook/Blockfrost) from a public key.
    // In bitcoin an account index is encoded directly in a public key, so blockbook will extract it
    // and return full derivation path for each derived address.
    // (https://github.com/trezor/blockbook/blob/b82dc92522eee957b7a139c38269a1844fe102f8/bchain/coins/btc/bitcoinparser.go#L428)
    // Since cardano account public key doesn't encode information about the account index, like Bitcoin does,
    // Blockfrost backend returns partial derivation path where account index is replaced with character 'i'.
    // So we rely on the client (this function) to replace it with correct account index.

    if (!addresses) return undefined;

    switch (networkType) {
        case 'cardano': {
            const replaceAccountIndex = (address: AccountAddress) => ({
                ...address,
                path: substituteBip43Path(address.path as Bip43PathTemplate, accountIndex),
            });

            return {
                ...addresses,
                used: addresses.used.map(replaceAccountIndex),
                unused: addresses.unused.map(replaceAccountIndex),
                change: addresses.change.map(replaceAccountIndex),
            };
        }
        case 'bitcoin': {
            // Pending txs (for counting recently used change addresses) are only
            // on first page of Blockbook getAccountInfo responses (moreover, electrum & coinjoin
            // backends always return page.index = 1)
            if (page?.index !== 1) return oldAddresses ?? addresses;

            const pendingTxs = transactions.filter(({ blockHeight = 0 }) => blockHeight <= 0);
            if (!pendingTxs.length) return addresses;

            const pendingTransfers = countAddressTransfers(pendingTxs);
            const addPendingTransfers = (address: AccountAddress) => ({
                ...address,
                transfers: address.transfers || pendingTransfers[address.address] || 0,
            });

            return {
                ...addresses,
                change: addresses.change.map(addPendingTransfers),
            };
        }
        default:
            return addresses;
    }
};

export const enhanceUtxo = (
    utxos: Account['utxo'],
    networkType: Account['networkType'],
    accountIndex: Account['index'],
): Account['utxo'] => {
    if (!utxos) return undefined;
    if (networkType !== 'cardano') return utxos;

    const enhancedUtxos = utxos.map(utxo => ({
        ...utxo,
        path: substituteBip43Path(utxo.path as Bip43PathTemplate, accountIndex),
    }));

    return enhancedUtxos;
};

export const enhanceHistory = ({
    total,
    unconfirmed,
    tokens,
    addrTxCount,
    txids,
}: AccountInfo['history']): Account['history'] => ({
    total,
    unconfirmed,
    tokens,
    addrTxCount,
    txids,
});

export const getAccountTokensFiatBalance = (
    account: Account,
    localCurrency: string,
    rates?: RatesByKey,
    tokens?: Account['tokens'],
) => {
    let totalBalance = new BigNumber(0);

    // sum fiat value of all tokens
    tokens?.forEach(t => {
        const tokenFiatRateKey = getFiatRateKey(
            account.symbol,
            localCurrency as FiatCurrencyCode,
            t.contract as TokenAddress,
        );

        const tokenFiatRate = rates?.[tokenFiatRateKey];
        if (tokenFiatRate?.rate && t.balance) {
            const tokenBalance = toFiatCurrency(t.balance, tokenFiatRate.rate, 2);
            if (tokenBalance) {
                totalBalance = totalBalance.plus(tokenBalance);
            }
        }
    });

    return totalBalance.toFixed();
};

export const getAssetTokensFiatBalance = (
    accounts: Account[],
    localCurrency: FiatCurrencyCode,
    rates?: RatesByKey,
) => {
    const totalBalance = accounts
        .reduce((total, account) => {
            const tokensBalance = getAccountTokensFiatBalance(
                account,
                localCurrency,
                rates,
                account.tokens,
            );

            return total.plus(tokensBalance ?? 0);
        }, new BigNumber(0))
        .toFixed();

    return totalBalance;
};

export const getStakingFiatBalance = (account: Account, rate: number | undefined) => {
    const balanceInEther = getAccountTotalStakingBalance(account);

    return toFiatCurrency(balanceInEther, rate, 2);
};

export const getAccountFiatBalance = ({
    account,
    localCurrency,
    rates,
    shouldIncludeTokens = true,
    shouldIncludeStaking = true,
}: {
    account: Account;
    localCurrency: FiatCurrencyCode;
    rates?: RatesByKey;
    shouldIncludeTokens?: boolean;
    shouldIncludeStaking?: boolean;
}) => {
    const coinFiatRateKey = getFiatRateKey(account.symbol, localCurrency);
    const coinFiatRate = rates?.[coinFiatRateKey];

    if (!coinFiatRate?.rate) return null;

    let totalBalance = new BigNumber(0);

    // account fiat balance
    const accountBalance = toFiatCurrency(account.formattedBalance, coinFiatRate.rate, 2);
    totalBalance = totalBalance.plus(accountBalance ?? 0);

    // sum fiat value of all tokens
    if (shouldIncludeTokens) {
        const tokensBalance = getAccountTokensFiatBalance(
            account,
            localCurrency,
            rates,
            account.tokens,
        );
        totalBalance = totalBalance.plus(tokensBalance ?? 0);
    }

    // account staking balance
    if (shouldIncludeStaking) {
        const stakingBalance = getStakingFiatBalance(account, coinFiatRate.rate);
        totalBalance = totalBalance.plus(stakingBalance ?? 0);
    }

    return totalBalance.toFixed();
};

export const getTotalFiatBalance = ({
    deviceAccounts,
    localCurrency,
    rates,
    shouldIncludeTokens = true,
    shouldIncludeStaking = true,
}: {
    deviceAccounts: Account[];
    localCurrency: FiatCurrencyCode;
    rates?: RatesByKey;
    shouldIncludeTokens?: boolean;
    shouldIncludeStaking?: boolean;
}) => {
    let instanceBalance = new BigNumber(0);
    deviceAccounts.forEach(a => {
        const accountFiatBalance =
            getAccountFiatBalance({
                account: a,
                localCurrency,
                rates,
                shouldIncludeTokens,
                shouldIncludeStaking,
            }) ?? '0';
        instanceBalance = instanceBalance.plus(accountFiatBalance);
    });

    return instanceBalance;
};

export const isTestnet = (symbol: NetworkSymbol) => networks[symbol].testnet;

export const isAccountOutdated = (account: Account, freshInfo: AccountInfo) => {
    if (
        // if backend/coin supports addrTxCount, compare it instead of total
        typeof freshInfo.history.addrTxCount === 'number'
            ? // addrTxCount (address/tx pairs) is different than before
              account.history.addrTxCount !== freshInfo.history.addrTxCount
            : // confirmed tx count is different than before
              // (unreliable for different getAccountInfo levels, that's why addrTxCount was added)
              account.history.total !== freshInfo.history.total
    )
        return true;

    // unconfirmed tx count is different than before
    if (account.history.unconfirmed !== freshInfo.history.unconfirmed) return true;

    switch (account.networkType) {
        case 'ripple':
            // different sequence or balance
            return (
                freshInfo.misc!.sequence !== account.misc.sequence ||
                freshInfo.balance !== account.balance ||
                freshInfo.misc!.reserve !== account.misc.reserve
            );
        case 'ethereum':
            return (
                freshInfo.misc!.nonce !== account.misc.nonce ||
                freshInfo.balance !== account.balance || // balance can change because of beacon chain txs (staking) |
                JSON.stringify(freshInfo?.misc?.stakingPools) !==
                    JSON.stringify(account?.misc?.stakingPools)
            );
        case 'cardano':
            return (
                // stake address (de)registration
                freshInfo.misc!.staking?.isActive !== account.misc.staking.isActive ||
                // changed rewards amount (rewards are distributed every epoch (5 days))
                freshInfo.misc!.staking?.rewards !== account.misc.staking.rewards ||
                // changed stake pool
                freshInfo.misc!.staking?.poolId !== account.misc.staking.poolId
            );
        case 'solana':
            // compare last transaction signature since the total number of txs may not be fetched fully
            return freshInfo.history.txids?.[0] !== account.history.txids?.[0];
        default:
            return false;
    }
};

// Used in accountActions and failed accounts
export const getAccountSpecific = (accountInfo: Partial<AccountInfo>, networkType: NetworkType) => {
    const { misc } = accountInfo;
    if (networkType === 'ripple') {
        return {
            networkType,
            misc: {
                sequence: misc && misc.sequence ? misc.sequence : 0,
                reserve: misc && misc.reserve ? misc.reserve : '0',
            },
            marker: accountInfo.marker,
            page: undefined,
        };
    }

    if (networkType === 'ethereum') {
        return {
            networkType,
            misc: {
                ...misc,
                nonce: misc && misc.nonce ? misc.nonce : '0',
            },
            marker: undefined,
            page: accountInfo.page,
        };
    }

    if (networkType === 'cardano') {
        return {
            networkType,
            misc: {
                staking: {
                    rewards: misc && misc.staking ? misc.staking.rewards : '0',
                    isActive: misc && misc.staking ? misc.staking.isActive : false,
                    address: misc && misc.staking ? misc.staking.address : '',
                    poolId: misc && misc.staking ? misc.staking.poolId : null,
                },
            },
            marker: undefined,
            page: accountInfo.page,
        };
    }

    if (networkType === 'solana') {
        return {
            networkType,
            misc: { rent: misc?.rent },
            marker: undefined,
            page: accountInfo.page,
        };
    }

    return {
        networkType,
        misc: undefined,
        marker: undefined,
        page: accountInfo.page,
    };
};

// Used in wallet/Menu and Dashboard
export const getFailedAccounts = (discovery: Discovery): Account[] =>
    discovery.failed.map(f => {
        const descriptor = `failed:${f.index}:${f.symbol}:${f.accountType}`;
        const network = networks[f.symbol];

        return {
            failed: true,
            deviceState: discovery.deviceState,
            index: f.index,
            path: substituteBip43Path(network.bip43Path), // placeholder - not relevant for failed, but required by TS to be an actual Bip43Path
            descriptor,
            key: descriptor,
            accountType: f.accountType,
            symbol: f.symbol,
            empty: false,
            visible: true,
            balance: '0',
            availableBalance: '0',
            formattedBalance: '0',
            tokens: [],
            addresses: undefined,
            utxo: undefined,
            history: {
                total: 0,
                unconfirmed: 0,
            },
            metadata: {
                key: descriptor,
            },
            ts: 0,
            ...getAccountSpecific({}, network.networkType),
        };
    });

export const getAccountIdentifier = (account: Account) => ({
    descriptor: account.descriptor,
    symbol: account.symbol,
    deviceState: account.deviceState,
});

export const accountSearchFn = (
    account: Account,
    rawSearchString?: string,
    coinFilter?: NetworkSymbol,
    metadataAccountLabel?: string,
) => {
    // if coin filter is active and account symbol doesn't match return false and don't continue the search
    const coinFilterMatch = coinFilter ? account.symbol === coinFilter : true;
    if (!coinFilterMatch) return false;

    const searchString = rawSearchString?.trim().toLowerCase();
    if (!searchString) return true; // no search string

    const network = networks[account.symbol];

    // helper func for searching in account's addresses
    const matchAddressFn = (u: NonNullable<Account['addresses']>['used'][number]) =>
        u.address.toLowerCase() === searchString;

    const symbolMatch = account.symbol.startsWith(searchString);
    const networkNameMatch = network?.name.toLowerCase().includes(searchString);
    const accountTypeMatch = account.accountType.startsWith(searchString);
    const descriptorMatch = account.descriptor.toLowerCase() === searchString;
    const addressMatch = account.addresses
        ? account.addresses.used.find(matchAddressFn) ||
          account.addresses.unused.find(matchAddressFn) ||
          account.addresses.change.find(matchAddressFn)
        : false;
    // find XRP accounts when users types in 'ripple'
    const matchXRPAlternativeName =
        network?.networkType === 'ripple' && 'ripple'.includes(searchString);

    const metadataMatch = !!metadataAccountLabel?.toLowerCase().includes(searchString);
    const accountLabelMatch = !!account.accountLabel?.toLowerCase().includes(searchString);

    return (
        symbolMatch ||
        networkNameMatch ||
        accountTypeMatch ||
        descriptorMatch ||
        addressMatch ||
        matchXRPAlternativeName ||
        metadataMatch ||
        accountLabelMatch
    );
};

export const getUtxoFromSignedTransaction = ({
    account,
    receivingAccount,
    tx,
    txid,
    prevTxid,
}: {
    account: Account;
    receivingAccount?: boolean;
    tx: GeneralPrecomposedTransactionFinal;
    txid: string;
    prevTxid?: string;
}) => {
    if (tx.type !== 'final') return [];

    // find utxo to replace
    const replaceUtxo = (prevTxid && account.utxo?.filter(u => u.txid === prevTxid)) || [];

    // remove utxo used by signed transaction or replaced by new tx (rbf)

    const findUtxo = (
        // this little func is needed in order to slightly change type inputs array to stop ts complaining
        // not sure how to do this in more elegant way
        inputs: (
            | PrecomposedTransactionFinalCardano['inputs'][number]
            | PrecomposedTransactionFinal['inputs'][number]
        )[],
    ) =>
        account.utxo?.filter(
            u =>
                !inputs.find(i => i.prev_hash === u.txid && i.prev_index === u.vout) &&
                u.txid !== prevTxid,
        ) || [];

    const utxo = findUtxo(tx.inputs);

    // join all account addresses
    const addresses = account.addresses
        ? account.addresses.unused.concat(account.addresses.used).concat(account.addresses.change)
        : [];

    // append utxo created by this transaction
    tx.outputs.forEach((output, vout) => {
        let addr: AccountAddress | undefined;
        if (!receivingAccount && 'address_n' in output && output.address_n) {
            // find change address
            const serialized = output.address_n.slice(3, 5).join('/');
            addr = account.addresses?.change.find(a => a.path.endsWith(serialized));
        }
        if ('address' in output) {
            // find self address
            addr = addresses.find(a => a.address === output.address);
        }

        // check if utxo should be added
        // may be spent already in case of rbf
        const utxoSpent =
            prevTxid && !replaceUtxo.find(u => u.address === addr?.address && u.vout === vout);

        if (addr && !utxoSpent) {
            utxo.unshift({
                vout,
                path: addr.path,
                address: addr.address,
                amount: output.amount.toString(),
                blockHeight: 0,
                confirmations: 0,
                txid,
            });
        }
    });

    return utxo;
};

/**
 * Returns concatenation of addresses.unused, addresses.used, addresses.changed
 */
export const getAccountAddresses = (account: Account) =>
    account.addresses
        ? account.addresses.unused.concat(account.addresses.used).concat(account.addresses.change)
        : [];

// update account before BLOCKCHAIN.NOTIFICATION or BLOCKCHAIN.BLOCK events
// solves race condition between pushing transaction and received notification
export const getPendingAccount = ({
    account,
    receivingAccount,
    tx,
    txid,
}: {
    account: Account;
    receivingAccount?: boolean;
    tx: GeneralPrecomposedTransactionFinal;
    txid: string;
}) => {
    // calculate availableBalance
    let availableBalanceBig = new BigNumber(account.availableBalance);

    const isRbf = isRbfTransaction(tx);

    if (!receivingAccount) {
        availableBalanceBig = availableBalanceBig.minus(isRbf ? tx.feeDifference : tx.totalSpent);
    }
    // get utxo
    const utxo = getUtxoFromSignedTransaction({
        account,
        tx,
        txid,
        prevTxid: isRbf ? tx.prevTxid : undefined,
        receivingAccount,
    });

    if (!isRbf) {
        // join all account addresses

        const addresses = getAccountAddresses(account);

        tx.outputs.forEach(output => {
            if ('address' in output) {
                // find self address
                if (addresses.find(a => a.address === output.address)) {
                    // append self outputs to balance
                    availableBalanceBig = availableBalanceBig.plus(output.amount);
                }
            }
        });
    }

    const availableBalance = availableBalanceBig.toString();

    return {
        ...account,
        availableBalance,
        formattedBalance: formatNetworkAmount(availableBalance, account.symbol),
        utxo,
    };
};

export const getNetworkAccountFeatures = ({
    symbol,
    accountType,
}: Pick<Account, 'symbol' | 'accountType'>): NetworkFeature[] => {
    const matchedNetwork = getNetwork(symbol);

    return matchedNetwork.accountTypes[accountType]?.features ?? matchedNetwork.features;
};

export const hasNetworkFeatures = (
    account: Account | undefined,
    features: NetworkFeature | Array<NetworkFeature>,
) => {
    if (!account) {
        return false;
    }

    const networkFeatures = getNetworkAccountFeatures(account);

    const areFeaturesPresent = ([] as NetworkFeature[])
        .concat(features)
        .every(feature => networkFeatures.includes(feature));

    return areFeaturesPresent;
};

// https://developer.bitcoin.org/reference/transactions.html#outpoint-the-specific-part-of-a-specific-output
export const getUtxoOutpoint = (utxo: { txid: string; vout: number }) => {
    if (utxo.txid.length !== 64) {
        throw new Error('Invalid length of txid');
    }
    const hash = bufferUtils.reverseBuffer(Buffer.from(utxo.txid, 'hex'));
    const buffer = Buffer.allocUnsafe(36);
    hash.copy(buffer);
    buffer.writeUInt32LE(utxo.vout, hash.length);

    return buffer.toString('hex');
};

// https://developer.bitcoin.org/reference/transactions.html#outpoint-the-specific-part-of-a-specific-output
export const readUtxoOutpoint = (outpoint: string) => {
    const buffer = Buffer.from(outpoint, 'hex');
    const txid = bufferUtils.reverseBuffer(buffer.subarray(0, 32));
    const vout = buffer.readUInt32LE(txid.length);

    return { txid: txid.toString('hex'), vout };
};

export const isSameUtxo = (a: AccountUtxo, b: AccountUtxo) =>
    a.txid === b.txid && a.vout === b.vout;

/**
 * Returns true if network uses receive address instead of XPUB.
 */
export const isAddressBasedNetwork = (networkType: NetworkType) => {
    if (networkType === 'bitcoin') return false;
    if (networkType === 'cardano') return false;
    if (networkType === 'ethereum') return true;
    if (networkType === 'ripple') return true;
    if (networkType === 'solana') return true;

    // Checks that all networkType options were handled.
    const exhaustiveCheck: never = networkType;

    return !!exhaustiveCheck;
};

export const isTokenMatchesSearch = (token: TokenInfo, search: string) => {
    return (
        token.symbol?.toLowerCase().includes(search) ||
        token.name?.toLowerCase().includes(search) ||
        token.contract.toLowerCase().includes(search) ||
        token.fingerprint?.toLowerCase().includes(search) ||
        token.policyId?.toLowerCase().includes(search)
    );
};
