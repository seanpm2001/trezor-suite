import { BigNumber } from '@trezor/utils/src/bigNumber';
import { Account, Rate, TokenAddress, RatesByKey } from '@suite-common/wallet-types';
import { TokenInfo } from '@trezor/connect';
import {
    getFiatRateKey,
    isNftMatchesSearch,
    isNftToken,
    isTokenMatchesSearch,
} from '@suite-common/wallet-utils';
import { NetworkSymbol, getNetworkFeatures } from '@suite-common/wallet-config';
import { FiatCurrencyCode } from '@suite-common/suite-config';
import {
    EnhancedTokenInfo,
    TokenDefinition,
    isTokenDefinitionKnown,
} from '@suite-common/token-definitions';

export interface TokensWithRates extends TokenInfo {
    fiatValue: BigNumber;
    fiatRate?: Rate;
}

// sort by 1. total fiat, 2. token price, 3. symbol length, 4. alphabetically
export const sortTokensWithRates = (a: TokensWithRates, b: TokensWithRates) => {
    const balanceSort =
        // Sort by balance multiplied by USD rate
        b.fiatValue.minus(a.fiatValue).toNumber() ||
        // If balance is equal, sort by USD rate
        (b.fiatRate?.rate || -1) - (a.fiatRate?.rate || -1) ||
        // If USD rate is equal or missing, sort by symbol length
        (a.symbol || '').length - (b.symbol || '').length ||
        // If symbol length is equal, sort by symbol name alphabetically
        (a.symbol || '').localeCompare(b.symbol || '');

    return balanceSort;
};

export const enhanceTokensWithRates = (
    tokens: Account['tokens'],
    fiatCurrency: FiatCurrencyCode,
    symbol: NetworkSymbol,
    rates?: RatesByKey,
) => {
    if (!tokens?.length) return [];

    const tokensWithRates = tokens.map(token => {
        const tokenFiatRateKey = getFiatRateKey(
            symbol,
            fiatCurrency,
            token.contract as TokenAddress,
        );
        const fiatRate = rates?.[tokenFiatRateKey];

        const fiatValue = new BigNumber(token.balance || 0).multipliedBy(fiatRate?.rate || 0);

        return {
            ...token,
            fiatRate,
            fiatValue,
        };
    });

    return tokensWithRates;
};

export const formatTokenSymbol = (symbol: string) => {
    const upperCasedSymbol = symbol.toUpperCase();
    const isTokenSymbolLong = upperCasedSymbol.length > 7;

    return isTokenSymbolLong ? `${upperCasedSymbol.slice(0, 7)}...` : upperCasedSymbol;
};

type GetTokens = {
    tokens: EnhancedTokenInfo[] | TokenInfo[];
    symbol: NetworkSymbol;
    tokenDefinitions?: TokenDefinition;
    searchQuery?: string;
    isNft?: boolean;
};

export type GetTokensOutputType = {
    shownWithBalance: EnhancedTokenInfo[];
    shownWithoutBalance: EnhancedTokenInfo[];
    hiddenWithBalance: EnhancedTokenInfo[];
    hiddenWithoutBalance: EnhancedTokenInfo[];
    unverifiedWithBalance: EnhancedTokenInfo[];
    unverifiedWithoutBalance: EnhancedTokenInfo[];
};

export const getTokens = ({
    tokens = [],
    symbol,
    tokenDefinitions,
    searchQuery,
    isNft = false,
}: GetTokens): GetTokensOutputType => {
    const filteredTokens = isNft
        ? tokens.filter(token => isNftToken(token))
        : tokens.filter(token => !isNftToken(token));

    const hasDefinitions = getNetworkFeatures(symbol).includes(
        isNft ? 'nft-definitions' : 'coin-definitions',
    );

    const shownWithBalance: EnhancedTokenInfo[] = [];
    const shownWithoutBalance: EnhancedTokenInfo[] = [];
    const hiddenWithBalance: EnhancedTokenInfo[] = [];
    const hiddenWithoutBalance: EnhancedTokenInfo[] = [];
    const unverifiedWithBalance: EnhancedTokenInfo[] = [];
    const unverifiedWithoutBalance: EnhancedTokenInfo[] = [];

    filteredTokens.forEach(token => {
        const isKnown = isTokenDefinitionKnown(tokenDefinitions?.data, symbol, token.contract);
        const isHidden = tokenDefinitions?.hide.includes(token.contract);
        const isShown = tokenDefinitions?.show.includes(token.contract);

        const query = searchQuery ? searchQuery.trim().toLowerCase() : '';

        if (
            searchQuery &&
            (!isTokenMatchesSearch(token, query) ||
                (isNft && isNftMatchesSearch(token as TokenInfo, query)))
        )
            return;

        const hasBalance =
            new BigNumber(token?.balance || '0').gt(0) ||
            (isNft && (token?.multiTokenValues?.length || 0) > 0);

        const pushToArray = (
            arrayWithBalance: EnhancedTokenInfo[],
            arrayWithoutBalance: EnhancedTokenInfo[],
        ) => {
            if (hasBalance) {
                arrayWithBalance.push(token);
            } else {
                arrayWithoutBalance.push(token);
            }
        };

        if (isShown) {
            pushToArray(shownWithBalance, shownWithoutBalance);
        } else if (hasDefinitions && !isKnown) {
            pushToArray(unverifiedWithBalance, unverifiedWithoutBalance);
        } else if (isHidden) {
            pushToArray(hiddenWithBalance, hiddenWithoutBalance);
        } else {
            pushToArray(shownWithBalance, shownWithoutBalance);
        }
    });

    return {
        shownWithBalance,
        shownWithoutBalance,
        hiddenWithBalance,
        hiddenWithoutBalance,
        unverifiedWithBalance,
        unverifiedWithoutBalance,
    };
};
