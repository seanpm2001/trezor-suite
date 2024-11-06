import styled from 'styled-components';

import { H3, Paragraph, variables } from '@trezor/components';
import { spacingsPx, typography } from '@trezor/theme';

import { Translation } from 'src/components/suite';
import { useSelector } from 'src/hooks/suite';
import { useCoinmarketLoadData } from 'src/hooks/wallet/coinmarket/useCoinmarketLoadData';
import { CoinmarketTransactionSell } from 'src/views/wallet/coinmarket/common/CoinmarketTransactions/CoinmarketTransactionsSell';
import { CoinmarketTransactionBuy } from 'src/views/wallet/coinmarket/common/CoinmarketTransactions/CoinmarketTransactionsBuy';
import { CoinmarketTransactionExchange } from 'src/views/wallet/coinmarket/common/CoinmarketTransactions/CoinmarketTransactionExchange';

const Wrapper = styled.div`
    padding: ${spacingsPx.zero} ${spacingsPx.lg};

    ${variables.SCREEN_QUERY.BELOW_DESKTOP} {
        padding: 0;
    }
`;

const Header = styled.div`
    padding-bottom: ${spacingsPx.xxl};
`;

const TransactionCount = styled.div`
    margin-top: ${spacingsPx.xxxs};
    ${typography.hint}
    color: ${({ theme }) => theme.textSubdued};
`;

export const CoinmarketTransactionsList = () => {
    const selectedAccount = useSelector(state => state.wallet.selectedAccount);
    const allTransactions = useSelector(state => state.wallet.coinmarket.trades);
    const activeSection = useSelector(state => state.wallet.coinmarket.activeSection);
    const buyProviders = useSelector(state => state.wallet.coinmarket.buy.buyInfo?.providerInfos);
    const exchangeProviders = useSelector(
        state => state.wallet.coinmarket.exchange.exchangeInfo?.providerInfos,
    );
    const sellProviders = useSelector(
        state => state.wallet.coinmarket.sell.sellInfo?.providerInfos,
    );
    const isBuyAndSell = activeSection !== 'exchange';

    useCoinmarketLoadData();

    if (selectedAccount.status !== 'loaded') {
        return null;
    }

    const { account } = selectedAccount;
    const sortedAccountTransactions = [...allTransactions].sort((a, b) => {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;

        return 0;
    });

    const buyTransactions = sortedAccountTransactions.filter(tx => tx.tradeType === 'buy');
    const exchangeTransactions = sortedAccountTransactions.filter(
        tx => tx.tradeType === 'exchange',
    );
    const sellTransactions = sortedAccountTransactions.filter(tx => tx.tradeType === 'sell');
    const buyAndSellTransactionLength = buyTransactions.length + sellTransactions.length;
    const isEmpty =
        (isBuyAndSell && buyAndSellTransactionLength === 0) ||
        (!isBuyAndSell && exchangeTransactions.length === 0);

    return (
        <Wrapper>
            {isEmpty && (
                <Paragraph align="center" variant="tertiary">
                    <Translation id="TR_BUY_NOT_TRANSACTIONS" />
                </Paragraph>
            )}
            {!isEmpty && (
                <>
                    <Header>
                        <H3>
                            <Translation id="TR_COINMARKET_LAST_TRANSACTIONS" />
                        </H3>
                        <TransactionCount>
                            {isBuyAndSell ? (
                                <Translation
                                    id="TR_COINMARKET_BUY_AND_SELL_COUNTER"
                                    values={{
                                        totalBuys: buyTransactions.length,
                                        totalSells: sellTransactions.length,
                                    }}
                                />
                            ) : (
                                <Translation
                                    id="TR_COINMARKET_SWAP_COUNTER"
                                    values={{
                                        totalSwaps: exchangeTransactions.length,
                                    }}
                                />
                            )}
                        </TransactionCount>
                    </Header>
                    {sortedAccountTransactions.map(trade => {
                        if (isBuyAndSell && trade.tradeType === 'buy') {
                            return (
                                <CoinmarketTransactionBuy
                                    account={account}
                                    key={`${trade.tradeType}-${trade.key}`}
                                    trade={trade}
                                    providers={buyProviders}
                                />
                            );
                        }
                        if (isBuyAndSell && trade.tradeType === 'sell') {
                            return (
                                <CoinmarketTransactionSell
                                    account={account}
                                    key={`${trade.tradeType}-${trade.key}`}
                                    trade={trade}
                                    providers={sellProviders}
                                />
                            );
                        }

                        if (!isBuyAndSell && trade.tradeType === 'exchange') {
                            return (
                                <CoinmarketTransactionExchange
                                    account={account}
                                    key={`${trade.tradeType}-${trade.key}`}
                                    trade={trade}
                                    providers={exchangeProviders}
                                />
                            );
                        }
                    })}
                </>
            )}
        </Wrapper>
    );
};
