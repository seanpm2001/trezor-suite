import { UtxoSorting, WalletAccountTransaction } from '@suite-common/wallet-types';
import type { AccountUtxo } from '@trezor/connect';
import { BigNumber } from '@trezor/utils';

type UtxoSortingFunction = (a: AccountUtxo, b: AccountUtxo) => number;

type UtxoSortingFunctionWithContext = (context: {
    accountTransactions: WalletAccountTransaction[];
}) => UtxoSortingFunction;

const performSecondarySorting: UtxoSortingFunction = (a, b) => {
    const secondaryComparison = b.txid.localeCompare(a.txid);
    if (secondaryComparison === 0) {
        return b.vout - a.vout;
    }

    return secondaryComparison;
};

const sortFromLargestToSmallest: UtxoSortingFunctionWithContext = () => (a, b) => {
    const comparisonResult = new BigNumber(b.amount).comparedTo(new BigNumber(a.amount));

    if (comparisonResult === 0) {
        return performSecondarySorting(a, b);
    }

    return comparisonResult;
};

const sortFromNewestToOldest: UtxoSortingFunctionWithContext =
    ({ accountTransactions }) =>
    (a, b) => {
        let valueA;
        let valueB;
        if (a.blockHeight > 0 && b.blockHeight > 0) {
            valueA = a.blockHeight;
            valueB = b.blockHeight;
        } else {
            // Pending transactions do not have blockHeight, so we must use blockTime of the transaction instead.
            const getBlockTime = (txid: string) => {
                const transaction = accountTransactions.find(
                    transaction => transaction.txid === txid,
                );

                return transaction?.blockTime ?? 0;
            };
            valueA = getBlockTime(a.txid);
            valueB = getBlockTime(b.txid);
        }

        const comparisonResult = valueB - valueA;

        if (comparisonResult === 0) {
            return performSecondarySorting(a, b);
        }

        return comparisonResult;
    };

const utxoSortMap: Record<UtxoSorting, UtxoSortingFunctionWithContext> = {
    largestFirst: sortFromLargestToSmallest,
    smallestFirst:
        context =>
        (...params) =>
            sortFromLargestToSmallest(context)(...params) * -1,

    newestFirst: sortFromNewestToOldest,
    oldestFirst:
        context =>
        (...params) =>
            sortFromNewestToOldest(context)(...params) * -1,
};

export const sortUtxos = (
    utxos: AccountUtxo[],
    utxoSorting: UtxoSorting | undefined,
    accountTransactions: WalletAccountTransaction[],
): AccountUtxo[] => {
    if (utxoSorting === undefined) {
        return utxos;
    }

    return [...utxos].sort(utxoSortMap[utxoSorting]({ accountTransactions }));
};
