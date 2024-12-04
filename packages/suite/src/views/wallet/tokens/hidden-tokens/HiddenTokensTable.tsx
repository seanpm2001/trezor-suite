import { SelectedAccountLoaded } from '@suite-common/wallet-types';
import { TokenManagementAction, selectCoinDefinitions } from '@suite-common/token-definitions';
import { spacings } from '@trezor/theme';
import { Banner, H3, Column } from '@trezor/components';
import { isTestnet } from '@suite-common/wallet-utils';

import { getTokens } from 'src/utils/wallet/tokenUtils';
import { useSelector } from 'src/hooks/suite';
import { Translation } from 'src/components/suite';

import { NoTokens } from '../common/NoTokens';
import { TokensTable } from '../common/TokensTable/TokensTable';

interface HiddenTokensTableProps {
    selectedAccount: SelectedAccountLoaded;
    searchQuery: string;
}

export const HiddenTokensTable = ({ selectedAccount, searchQuery }: HiddenTokensTableProps) => {
    const { account, network } = selectedAccount;

    const coinDefinitions = useSelector(state => selectCoinDefinitions(state, account.symbol));

    const sortedTokens = account.tokens
        ? [...account.tokens].sort(
              (a, b) => parseInt(b?.balance || '0') - parseInt(a?.balance || '0'),
          )
        : [];

    const filteredTokens = getTokens({
        tokens: sortedTokens,
        symbol: account.symbol,
        tokenDefinitions: coinDefinitions,
        searchQuery,
    });
    const tokens = getTokens({
        tokens: sortedTokens,
        symbol: account.symbol,
        tokenDefinitions: coinDefinitions,
    });

    const hiddenTokensCount = tokens.hiddenWithBalance.length + tokens.hiddenWithoutBalance.length;
    const unverifiedTokensCount =
        tokens.unverifiedWithBalance.length + tokens.unverifiedWithoutBalance.length;

    return (
        <Column gap={spacings.xxl}>
            {hiddenTokensCount === 0 && unverifiedTokensCount === 0 && (
                <NoTokens title={<Translation id="TR_HIDDEN_TOKENS_EMPTY" />} />
            )}
            {hiddenTokensCount > 0 && (
                <TokensTable
                    hideRates={isTestnet(account.symbol)}
                    account={account}
                    tokenStatusType={TokenManagementAction.SHOW}
                    tokensWithBalance={filteredTokens.hiddenWithBalance}
                    tokensWithoutBalance={filteredTokens.hiddenWithoutBalance}
                    network={network}
                    searchQuery={searchQuery}
                />
            )}
            {unverifiedTokensCount > 0 && (
                <Column gap={spacings.sm}>
                    <H3>
                        <Translation id="TR_TOKEN_UNRECOGNIZED_BY_TREZOR" />
                    </H3>
                    <Banner variant="warning" icon>
                        <Translation id="TR_TOKEN_UNRECOGNIZED_BY_TREZOR_TOOLTIP" />
                    </Banner>
                    <TokensTable
                        account={account}
                        hideRates
                        tokenStatusType={TokenManagementAction.SHOW}
                        isUnverifiedTable
                        tokensWithBalance={filteredTokens.unverifiedWithBalance}
                        tokensWithoutBalance={filteredTokens.unverifiedWithoutBalance}
                        network={network}
                        searchQuery={searchQuery}
                    />
                </Column>
            )}
        </Column>
    );
};
