import { PayloadAction } from '@reduxjs/toolkit';

import { createReducerWithExtraDeps, createWeakMapSelector } from '@suite-common/redux-utils';
import {
    BackendType,
    getNetworkOptional,
    networksCollection,
    NetworkSymbol,
} from '@suite-common/wallet-config';
import { Blockchain, BlockchainNetworks } from '@suite-common/wallet-types';
import {
    BLOCKCHAIN as TREZOR_CONNECT_BLOCKCHAIN_ACTIONS,
    BlockchainBlock,
    BlockchainError,
    BlockchainReconnecting,
    BlockchainInfo,
} from '@trezor/connect';

import { blockchainActions } from './blockchainActions';

/*
  get url suffix from default network and generate url for selected network
  regex source: https://www.oreilly.com/library/view/regular-expressions-cookbook/9780596802837/ch07s12.html
*/
export const getBlockExplorerUrlSuffix = (url: string) =>
    url.match(/^([a-z][a-z0-9+\-.]*:(\/\/[^/?#]+)?)?([a-z0-9\-._~%!$&'()*+,;=:@/]*)/)!.pop();

export const isHttpProtocol = (url: string) => /^https?:\/\//.test(url);

export type BlockchainState = BlockchainNetworks;

const initialStatePredefined: Partial<BlockchainState> = {};

export type BlockchainRootState = { wallet: { blockchain: BlockchainState } };

// fill initial state, those values will be changed by BLOCKCHAIN.UPDATE_FEE action
export const blockchainInitialState: BlockchainNetworks = networksCollection.reduce(
    (state, network) => {
        state[network.symbol] = {
            connected: false,
            explorer: network.explorer,
            blockHash: '0',
            blockHeight: 0,
            version: '0',
            backends:
                network.symbol === 'regtest'
                    ? {
                          selected: 'blockbook',
                          urls: {
                              blockbook: ['http://localhost:19121'],
                          },
                      }
                    : {},
        };

        return state;
    },
    initialStatePredefined as BlockchainState,
);

const writeIdentityConnection = (
    state: BlockchainState,
    symbol: NetworkSymbol,
    identity: string,
    data: Partial<NonNullable<Blockchain['identityConnections']>[string]>,
) => {
    const blockchain = state[symbol];
    const connections = blockchain.identityConnections ?? (blockchain.identityConnections = {});
    connections[identity] = {
        ...(connections[identity] ?? { connected: false }),
        ...data,
    };
};

const connect = (draft: BlockchainState, info: BlockchainInfo) => {
    const network = getNetworkOptional(info.coin.shortcut.toLowerCase());
    if (!network) return;

    if (info.identity) {
        writeIdentityConnection(draft, network.symbol, info.identity, {
            connected: true,
            error: undefined,
            reconnectionTime: undefined,
        });

        return;
    }

    const isHttp = isHttpProtocol(info.url); // can use dynamic backend url settings

    // solana rpc nodes do not have explorer, so we cannot use backend as explorer
    const isBackendAlsoExplorer = network.networkType !== 'solana';

    const useBackendAsExplorer = isHttp && isBackendAlsoExplorer;

    draft[network.symbol] = {
        url: info.url,
        explorer: {
            tx: `${
                useBackendAsExplorer
                    ? info.url + getBlockExplorerUrlSuffix(network.explorer.tx)
                    : network.explorer.tx
            }`,
            account: `${
                useBackendAsExplorer
                    ? info.url + getBlockExplorerUrlSuffix(network.explorer.account)
                    : network.explorer.account
            }`,
            queryString: network.explorer.queryString,
            nft: network.explorer.nft
                ? `${
                      isHttp
                          ? info.url + getBlockExplorerUrlSuffix(network.explorer.nft)
                          : network.explorer.nft
                  }`
                : undefined,
            address: `${
                isHttp
                    ? info.url + getBlockExplorerUrlSuffix(network.explorer.address)
                    : network.explorer.address
            }`,
        },
        connected: true,
        blockHash: info.blockHash,
        blockHeight: info.blockHeight,
        version: info.version,
        backends: draft[network.symbol].backends,
        identityConnections: draft[network.symbol].identityConnections,
    };
};

const error = (draft: BlockchainState, payload: BlockchainError) => {
    const {
        error,
        identity,
        coin: { shortcut: symbol },
    } = payload;
    const network = getNetworkOptional(symbol.toLowerCase());
    if (!network) return;

    if (identity) {
        writeIdentityConnection(draft, network.symbol, identity, { connected: false, error });
    } else {
        draft[network.symbol] = {
            ...draft[network.symbol],
            connected: false,
            explorer: network.explorer,
            error,
        };
        delete draft[network.symbol].url;
    }
};

const update = (draft: BlockchainState, block: BlockchainBlock) => {
    const network = getNetworkOptional(block.coin.shortcut.toLowerCase());
    if (!network) return;

    draft[network.symbol] = {
        ...draft[network.symbol],
        blockHash: block.blockHash,
        blockHeight: block.blockHeight,
    };
};

const reconnecting = (draft: BlockchainState, payload: BlockchainReconnecting) => {
    const network = getNetworkOptional(payload.coin.shortcut.toLowerCase());
    if (!network) return;

    if (payload.identity) {
        writeIdentityConnection(draft, network.symbol, payload.identity, {
            reconnectionTime: payload.time,
        });
    } else {
        draft[network.symbol] = {
            ...draft[network.symbol],
            reconnectionTime: payload.time,
        };
    }
};

export const prepareBlockchainReducer = createReducerWithExtraDeps(
    blockchainInitialState,
    (builder, extra) => {
        builder
            .addCase(blockchainActions.synced, (state, action) => {
                state[action.payload.symbol].syncTimeout = action.payload.timeout;
            })
            .addCase(blockchainActions.setBackend, (state, action) => {
                const { coin, type } = action.payload;
                if (type === 'default') {
                    delete state[coin].backends.selected;
                } else if (!action.payload.urls.length) {
                    delete state[coin].backends.selected;
                    delete state[coin].backends.urls?.[type as BackendType];
                } else {
                    state[coin].backends.selected = type as BackendType;
                    state[coin].backends.urls = {
                        ...state[coin].backends.urls,
                        [type as BackendType]: action.payload.urls,
                    };
                }
            })
            .addCase(extra.actionTypes.storageLoad, extra.reducers.storageLoadBlockchain)
            .addMatcher(
                action => action.type === TREZOR_CONNECT_BLOCKCHAIN_ACTIONS.CONNECT,
                (state, { payload }: PayloadAction<BlockchainInfo>) => {
                    connect(state, payload);
                },
            )
            .addMatcher(
                action => action.type === TREZOR_CONNECT_BLOCKCHAIN_ACTIONS.ERROR,
                (state, { payload }: PayloadAction<BlockchainError>) => {
                    error(state, payload);
                },
            )
            .addMatcher(
                action => action.type === TREZOR_CONNECT_BLOCKCHAIN_ACTIONS.RECONNECTING,
                (state, { payload }: PayloadAction<BlockchainReconnecting>) => {
                    reconnecting(state, payload);
                },
            )
            .addMatcher(
                action => action.type === TREZOR_CONNECT_BLOCKCHAIN_ACTIONS.BLOCK,
                (state, { payload }: PayloadAction<BlockchainBlock>) => {
                    update(state, payload);
                },
            );
    },
);

const createMemoizedSelector = createWeakMapSelector.withTypes<BlockchainRootState>();

export const selectBlockchainState = (state: BlockchainRootState) => state.wallet.blockchain;

export const selectNetworkBlockchainInfo = (
    state: BlockchainRootState,
    networkSymbol: NetworkSymbol,
) => state.wallet.blockchain[networkSymbol];

export const selectBlockchainHeightBySymbol = createMemoizedSelector(
    [selectNetworkBlockchainInfo],
    blockchain => blockchain?.blockHeight ?? null,
);

export const selectBlockchainExplorerBySymbol = createMemoizedSelector(
    [selectNetworkBlockchainInfo],
    blockchain => blockchain?.explorer ?? null,
);

export const selectBlockchainBlockInfoBySymbol = createMemoizedSelector(
    [selectNetworkBlockchainInfo],
    blockchain => ({
        blockhash: blockchain.blockHash,
        blockHeight: blockchain.blockHeight,
    }),
);
