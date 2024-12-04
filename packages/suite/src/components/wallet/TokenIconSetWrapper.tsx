import { selectCoinDefinitions } from '@suite-common/token-definitions';
import { TokenIconSet } from '@trezor/product-components';
import { selectCurrentFiatRates } from '@suite-common/wallet-core';
import { Account } from '@suite-common/wallet-types';
import { NetworkSymbol } from '@suite-common/wallet-config';
import { BigNumber } from '@trezor/utils';

import { selectLocalCurrency } from 'src/reducers/wallet/settingsReducer';
import { useSelector } from 'src/hooks/suite';
import {
    enhanceTokensWithRates,
    getTokens,
    sortTokensWithRates,
    TokensWithRates,
} from 'src/utils/wallet/tokenUtils';

type TokenIconSetWrapperProps = {
    accounts: Account[];
    symbol: NetworkSymbol;
};

export const TokenIconSetWrapper = ({ accounts, symbol }: TokenIconSetWrapperProps) => {
    const localCurrency = useSelector(selectLocalCurrency);
    const fiatRates = useSelector(selectCurrentFiatRates);
    const coinDefinitions = useSelector(state => selectCoinDefinitions(state, symbol));

    const allTokensWithRates = accounts.flatMap(account =>
        enhanceTokensWithRates(account.tokens, localCurrency, symbol, fiatRates),
    );

    if (!allTokensWithRates.length) return null;

    const tokens = getTokens({
        tokens: allTokensWithRates,
        symbol,
        tokenDefinitions: coinDefinitions,
    })?.shownWithBalance as TokensWithRates[];

    const aggregatedTokens = Object.values(
        tokens.reduce((acc: Record<string, TokensWithRates>, token) => {
            const { contract, balance, fiatValue } = token;

            if (!acc[contract]) {
                acc[contract] = {
                    ...token,
                    balance: balance ?? '0',
                    fiatValue: fiatValue ?? BigNumber(0),
                };
            } else {
                const existingBalance = parseFloat(acc[contract].balance ?? '0');
                const newBalance = existingBalance + parseFloat(balance ?? '0');
                acc[contract].balance = newBalance.toString();

                acc[contract].fiatValue = acc[contract].fiatValue.plus(fiatValue);
            }

            return acc;
        }, {}),
    );

    const sortedAggregatedTokens = aggregatedTokens.sort(sortTokensWithRates);

    return <TokenIconSet symbol={symbol} tokens={sortedAggregatedTokens} />;
};
