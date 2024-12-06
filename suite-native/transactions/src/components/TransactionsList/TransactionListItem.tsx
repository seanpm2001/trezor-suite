import { useSelector } from 'react-redux';

import { AccountKey } from '@suite-common/wallet-types';
import {
    CryptoAmountFormatter,
    CryptoToFiatAmountFormatter,
    SignValueFormatter,
} from '@suite-native/formatters';
import { Box } from '@suite-native/atoms';
import {
    AccountsRootState,
    selectIsPhishingTransaction,
    selectIsTestnetAccount,
    TransactionsRootState,
} from '@suite-common/wallet-core';
import { EmptyAmountText } from '@suite-native/formatters/src/components/EmptyAmountText';
import { WalletAccountTransaction } from '@suite-native/tokens';
import { TokenDefinitionsRootState } from '@suite-common/token-definitions';
import { prepareNativeStyle, useNativeStyles } from '@trezor/styles';

import { useTransactionFiatRate } from '../../hooks/useTransactionFiatRate';
import { TokenTransferListItem } from './TokenTransferListItem';
import { TransactionListItemContainer } from './TransactionListItemContainer';
import { getTransactionValueSign } from '../../utils';

type TransactionListItemProps = {
    transaction: WalletAccountTransaction;
    accountKey: AccountKey;
    isFirst?: boolean;
    isLast?: boolean;
};

const failedTxStyle = prepareNativeStyle<{ isFailedTx: boolean }>((_, { isFailedTx }) => ({
    extend: {
        condition: isFailedTx,
        style: {
            textDecorationLine: 'line-through',
        },
    },
}));

export const TransactionListItemValues = ({
    accountKey,
    transaction,
}: {
    accountKey: AccountKey;
    transaction: WalletAccountTransaction;
}) => {
    const isTestnetAccount = useSelector((state: AccountsRootState) =>
        selectIsTestnetAccount(state, accountKey),
    );

    const isPhishingTransaction = useSelector(
        (state: TokenDefinitionsRootState & TransactionsRootState) =>
            selectIsPhishingTransaction(state, transaction.txid, accountKey),
    );

    const { applyStyle } = useNativeStyles();

    const historicRate = useTransactionFiatRate({ accountKey, transaction });
    const isFailedTx = transaction.type === 'failed';

    return (
        <>
            {isTestnetAccount ? (
                <EmptyAmountText />
            ) : (
                <Box flexDirection="row">
                    {!isFailedTx && (
                        <SignValueFormatter value={getTransactionValueSign(transaction.type)} />
                    )}
                    <CryptoToFiatAmountFormatter
                        value={Number(transaction.amount)}
                        symbol={transaction.symbol}
                        historicRate={historicRate}
                        useHistoricRate
                        isForcedDiscreetMode={isPhishingTransaction}
                        style={applyStyle(failedTxStyle, { isFailedTx })}
                    />
                </Box>
            )}

            <CryptoAmountFormatter
                value={transaction.amount}
                symbol={transaction.symbol}
                isBalance={false}
                numberOfLines={1}
                adjustsFontSizeToFit
                isForcedDiscreetMode={isPhishingTransaction}
                variant="hint"
                color="textSubdued"
            />
        </>
    );
};

export const TransactionListItem = ({
    transaction,
    accountKey,
    isFirst = false,
    isLast = false,
}: TransactionListItemProps) => {
    const includedCoinsCount = transaction.tokens.length;

    const isTokenOnlyTransaction = transaction.amount === '0' && transaction.tokens.length !== 0;

    if (isTokenOnlyTransaction)
        return (
            <TokenTransferListItem
                transaction={transaction}
                accountKey={accountKey}
                txid={transaction.txid}
                tokenTransfer={transaction.tokens[0]}
                includedCoinsCount={transaction.tokens.length - 1}
                isFirst={isFirst}
                isLast={isLast}
            />
        );

    return (
        <TransactionListItemContainer
            networkSymbol={transaction.symbol}
            txid={transaction.txid}
            transactionType={transaction.type}
            accountKey={accountKey}
            includedCoinsCount={includedCoinsCount}
            isFirst={isFirst}
            isLast={isLast}
        >
            <TransactionListItemValues accountKey={accountKey} transaction={transaction} />
        </TransactionListItemContainer>
    );
};

TransactionListItem.displayName = 'TransactionListItem';
