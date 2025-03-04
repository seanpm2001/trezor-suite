import { throwError } from '@trezor/utils';
import type { GetInfo as Req } from '@trezor/blockchain-link-types/src/messages';
import type { GetInfo as Res } from '@trezor/blockchain-link-types/src/responses';

import { Api, blockheaderToBlockhash } from '../utils';

const getInfo: Api<Req, Res> = client => {
    const {
        url,
        coin,
        block: { hex, height },
        version: [_name, version],
    } = client.getInfo() || throwError('Client not initialized');

    return Promise.resolve({
        url,
        version,
        blockHeight: height,
        blockHash: blockheaderToBlockhash(hex),
        name: 'Bitcoin',
        shortcut: coin,
        testnet: coin === 'REGTEST',
        decimals: 8,
    });
};

export default getInfo;
