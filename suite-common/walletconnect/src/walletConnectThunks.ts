import { Core } from '@walletconnect/core';
import { WalletKit } from '@reown/walletkit';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { WalletKit as WalletKitClient } from '@reown/walletkit/dist/types/client';

import { createThunk } from '@suite-common/redux-utils';

const WALLETCONNECT_MODULE = '@common/walletconnect';

const PROJECT_ID = '203549d0480d0f24d994780f34889b03';

let walletKit: WalletKitClient;

export const walletConnectInitThunk = createThunk(
    `${WALLETCONNECT_MODULE}/walletConnectInitThunk`,
    async (_, { dispatch }) => {
        const core = new Core({
            projectId: PROJECT_ID,
        });

        const metadata = {
            name: 'Trezor Suite',
            description: 'Manage your Trezor device',
            url: 'https://suite.trezor.io',
            icons: ['https://assets.reown.com/reown-profile-pic.png'],
        };

        walletKit = await WalletKit.init({
            core,
            metadata,
        });
        walletKit.on('session_proposal', async event => {
            try {
                const approvedNamespaces = buildApprovedNamespaces({
                    proposal: event.params,
                    supportedNamespaces: {
                        eip155: {
                            // TODO get enabled chains
                            chains: ['eip155:1', 'eip155:137'],
                            // TODO methods
                            methods: ['eth_sendTransaction', 'personal_sign'],
                            events: ['accountsChanged', 'chainChanged'],
                            accounts: [
                                // TODO get current accounts
                                'eip155:1:0xab16a96d359ec26a11e2c2b3d8f8b8942d5bfcdb',
                                'eip155:137:0xab16a96d359ec26a11e2c2b3d8f8b8942d5bfcdb',
                            ],
                        },
                    },
                });

                const session = await walletKit.approveSession({
                    id: event.id,
                    namespaces: approvedNamespaces,
                });

                console.log(session);
            } catch (error) {
                console.error(error);

                await walletKit.rejectSession({
                    id: event.id,
                    reason: getSdkError('USER_REJECTED'),
                });
            }
        });

        walletKit.on('session_request', async event => {
            console.log(event);
        });
    },
);

export const walletConnectPairThunk = createThunk<void, { uri: string }>(
    `${WALLETCONNECT_MODULE}/walletConnectPairThunk`,
    async ({ uri }, { dispatch }) => {
        const session = await walletKit.pair({ uri });
        console.log(session);
    },
);
