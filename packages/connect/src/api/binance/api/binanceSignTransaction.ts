// origin: https://github.com/trezor/connect/blob/develop/src/js/core/methods/BinanceSignTransaction.js

import { AssertWeak } from '@trezor/schema-utils';

import { validatePath } from '../../../utils/pathUtils';
import * as helper from '../binanceSignTx';
import { BinanceSignTransaction as BinanceSignTransactionSchema } from '../../../types/api/binance';
import type { BinancePreparedTransaction } from '../../../types/api/binance';
import { BinanceAbstractMethod } from './binanceAbstractMethods';

type Params = {
    path: number[];
    transaction: BinancePreparedTransaction;
    chunkify?: boolean;
};

export default class BinanceSignTransaction extends BinanceAbstractMethod<
    'binanceSignTransaction',
    Params
> {
    init() {
        this.requiredPermissions = ['read', 'write'];

        const { payload } = this;
        // validate incoming parameters
        // TODO: weak assert for compatibility purposes (issue #10841)
        AssertWeak(BinanceSignTransactionSchema, payload);

        const path = validatePath(payload.path, 3);
        const transaction = helper.validate(payload.transaction);

        this.params = {
            path,
            transaction,
            chunkify: payload.chunkify ?? false,
        };
    }

    get info() {
        return 'Sign Binance transaction';
    }

    run() {
        return helper.signTx(
            this.device.getCommands().typedCall.bind(this.device.getCommands()),
            this.params.path,
            this.params.transaction,
            this.params.chunkify,
        );
    }
}
