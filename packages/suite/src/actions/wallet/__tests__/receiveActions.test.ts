import { connectInitThunk } from '@suite-common/connect-init';
import { testMocks } from '@suite-common/test-utils';
import { prepareDeviceReducer } from '@suite-common/wallet-core';
import { AccountKey } from '@suite-common/wallet-types';
import type { NetworkSymbol, NetworkType } from '@suite-common/wallet-config';

import { configureStore } from 'src/support/tests/configureStore';
import receiveReducer from 'src/reducers/wallet/receiveReducer';
import suiteReducer from 'src/reducers/suite/suiteReducer';
import modalReducer from 'src/reducers/suite/modalReducer';
import * as receiveActions from 'src/actions/wallet/receiveActions';
import { extraDependencies } from 'src/support/extraDependencies';

import fixtures from '../__fixtures__/receiveActions';

const { getSuiteDevice } = testMocks;

const deviceReducer = prepareDeviceReducer(extraDependencies);

const TrezorConnect = testMocks.getTrezorConnectMock();

const setTrezorConnectFixtures = (fixture?: any) => {
    let buttonRequest: ((e?: any) => any) | undefined;

    const getAddress = (_params: any) => {
        if (fixture && fixture.getAddress) {
            if (fixture.getAddress.success && buttonRequest) {
                buttonRequest({ code: 'ButtonRequest_Address' });
            }

            return fixture.getAddress;
        }
        // trigger multiple button requests
        if (buttonRequest) {
            buttonRequest({ code: 'ButtonRequest_Address' });
            buttonRequest({ code: 'some-other-code' });
            buttonRequest();
        }

        return {
            success: true,
            payload: {
                address: '3AnYTd2FGxJLNKL1AzxfW3FJMntp9D2KKX',
            },
        };
    };

    jest.spyOn(TrezorConnect, 'on').mockImplementation((event: string, cb) => {
        if (event === 'ui-button') buttonRequest = cb;
    });
    jest.spyOn(TrezorConnect, 'off').mockImplementation(() => {
        buttonRequest = undefined;
    });
    jest.spyOn(TrezorConnect, 'getAddress').mockImplementation(getAddress);
    jest.spyOn(TrezorConnect, 'ethereumGetAddress').mockImplementation(getAddress);
    jest.spyOn(TrezorConnect, 'rippleGetAddress').mockImplementation(getAddress);
};

type ReceiveState = ReturnType<typeof receiveReducer>;
type SuiteState = ReturnType<typeof suiteReducer>;
type ModalState = ReturnType<typeof modalReducer>;
type DeviceState = ReturnType<typeof deviceReducer>;

interface InitialState {
    suite: Partial<SuiteState>;
    wallet: {
        receive: ReceiveState;
        selectedAccount: {
            account?: {
                key: AccountKey;
                networkType: 'bitcoin' | 'ethereum' | 'ripple';
            };
        };
        accounts: [
            {
                key: AccountKey;
                symbol: NetworkSymbol;
                networkType: NetworkType;
            },
        ];
        settings: {
            enabledNetworks: string[];
        };
    };
    device: Partial<DeviceState>;
    modal: ModalState;
}

const getInitialState = (state: Partial<InitialState> | undefined) => ({
    suite: {
        ...suiteReducer(undefined, { type: 'foo' } as any),
        ...state?.suite,
    },
    wallet: {
        receive: receiveReducer([], { type: 'foo' } as any),
        selectedAccount: {
            account: {
                key: 'selected-account-key',
                networkType: 'bitcoin',
            },
        },
        settings: {
            enabledNetworks: ['btc'],
        },
        accounts: [{ key: 'selected-account-key', symbol: 'btc', networkType: 'bitcoin' }],
        ...state?.wallet,
    },
    modal: {
        ...modalReducer(undefined, { type: 'foo' } as any),
        ...state?.modal,
    },
    device: {
        ...deviceReducer(undefined, { type: 'foo' } as any),
        selectedDevice: getSuiteDevice({ available: true, connected: true }),
        ...state?.device,
    },
});

type State = ReturnType<typeof getInitialState>;
const mockStore = configureStore<State, any>();

const initStore = (state: State) => {
    const store = mockStore(state);
    store.subscribe(() => {
        const action = store.getActions().pop();
        const { receive } = store.getState().wallet;
        store.getState().wallet.receive = receiveReducer(receive, action);
        // add action back to stack
        store.getActions().push(action);
    });

    return store;
};

describe('ReceiveActions', () => {
    fixtures.forEach(f => {
        it(f.description, async () => {
            setTrezorConnectFixtures(f.mocks);
            const state = getInitialState(f.initialState as any);
            const store = initStore(state);
            await store.dispatch(connectInitThunk());
            await store.dispatch(f.action());

            if (f.result && f.result.actions) {
                expect(store.getActions()).toMatchObject(f.result.actions);
            }
        });
    });

    it('show unverified address then verify', async () => {
        setTrezorConnectFixtures();
        const state = getInitialState({});
        const store = initStore(state);
        await store.dispatch(connectInitThunk());

        const VERIFIED = [{ path: 'a', address: 'b', isVerified: true }];
        const UNVERIFIED = [{ path: 'a', address: 'b', isVerified: false }];

        await store.dispatch(receiveActions.openAddressModal({ addressPath: 'a', value: 'b' }));
        expect(store.getState().wallet.receive).toEqual(UNVERIFIED);

        await store.dispatch(receiveActions.showAddress('a', 'b'));
        expect(store.getState().wallet.receive).toEqual(VERIFIED);

        await store.dispatch(receiveActions.openAddressModal({ addressPath: 'a', value: 'b' }));
        expect(store.getState().wallet.receive).toEqual(UNVERIFIED);

        // add second
        await store.dispatch(receiveActions.openAddressModal({ addressPath: 'c', value: 'd' }));
        expect(store.getState().wallet.receive.length).toEqual(2);

        // clear
        await store.dispatch(receiveActions.dispose());
        expect(store.getState().wallet.receive.length).toEqual(0);
    });
});
