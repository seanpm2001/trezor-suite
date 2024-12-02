import { testMocks } from '@suite-common/test-utils';

import { sortUtxos } from '../utxoSortingUtils';

const UTXOS = [
    testMocks.getUtxo({ amount: '1', blockHeight: undefined, txid: 'txid1', vout: 0 }),
    testMocks.getUtxo({ amount: '1', blockHeight: undefined, txid: 'txid2', vout: 1 }),
    testMocks.getUtxo({ amount: '2', blockHeight: 1, txid: 'txid2', vout: 0 }),
    testMocks.getUtxo({ amount: '2', blockHeight: 2, txid: 'txid3', vout: 0 }),
];

const ACCOUNT_TRANSACTIONS = [
    testMocks.getWalletTransaction({ txid: 'txid1', blockTime: undefined }),
    testMocks.getWalletTransaction({ txid: 'txid2', blockTime: 1 }),
    testMocks.getWalletTransaction({ txid: 'txid3', blockTime: 2 }),
];

describe('sortUtxos', () => {
    it('should sort UTXOs by newest first', () => {
        const sortedUtxos = sortUtxos(UTXOS, 'newestFirst', ACCOUNT_TRANSACTIONS);
        expect(sortedUtxos).toEqual([UTXOS[3], UTXOS[1], UTXOS[2], UTXOS[0]]);
    });

    it('should sort UTXOs by oldest first', () => {
        const sortedUtxos = sortUtxos(UTXOS, 'oldestFirst', ACCOUNT_TRANSACTIONS);
        expect(sortedUtxos).toEqual([UTXOS[0], UTXOS[2], UTXOS[1], UTXOS[3]]);
    });

    it('should sort UTXOs by largest first', () => {
        const sortedUtxos = sortUtxos(UTXOS, 'largestFirst', ACCOUNT_TRANSACTIONS);
        expect(sortedUtxos).toEqual([UTXOS[3], UTXOS[2], UTXOS[1], UTXOS[0]]);
    });

    it('should sort UTXOs by smallest first', () => {
        const sortedUtxos = sortUtxos(UTXOS, 'smallestFirst', ACCOUNT_TRANSACTIONS);
        expect(sortedUtxos).toEqual([UTXOS[0], UTXOS[1], UTXOS[2], UTXOS[3]]);
    });

    it('should return the original array if utxoSorting is undefined', () => {
        const sortedUtxos = sortUtxos(UTXOS, undefined, ACCOUNT_TRANSACTIONS);
        expect(sortedUtxos).toEqual(UTXOS);
    });
});
