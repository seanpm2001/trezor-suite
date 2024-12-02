import { isAnyOf } from '@reduxjs/toolkit';

import { createMiddleware } from '@suite-common/redux-utils';
import {
    messageSystemActions,
    categorizeMessages,
    getValidMessages,
    selectMessageSystemConfig,
} from '@suite-common/message-system';
import { deviceActions, selectDevice } from '@suite-common/wallet-core';
import {
    selectDeviceEnabledDiscoveryNetworkSymbols,
    toggleEnabledDiscoveryNetworkSymbol,
} from '@suite-native/discovery';
import { FeatureFlag, setFeatureFlag } from '@suite-native/feature-flags';

import { selectIsSolanaFeatureEnabled } from './selectors';

const isAnyOfMessageSystemAffectingActions = isAnyOf(
    messageSystemActions.fetchSuccessUpdate,
    deviceActions.selectDevice,
    deviceActions.connectDevice,
    toggleEnabledDiscoveryNetworkSymbol,
);

export const messageSystemMiddleware = createMiddleware((action, { next, dispatch, getState }) => {
    // The action has to be handled by the reducer first to apply its
    // changes first, because this middleware expects already updated state.
    next(action);

    if (isAnyOfMessageSystemAffectingActions(action)) {
        const config = selectMessageSystemConfig(getState());
        const device = selectDevice(getState());
        const enabledNetworks = selectDeviceEnabledDiscoveryNetworkSymbols(getState());

        const validMessages = getValidMessages(config, {
            device,
            settings: {
                tor: false, // not supported in suite-native
                enabledNetworks,
            },
        });

        const categorizedValidMessages = categorizeMessages(validMessages);

        dispatch(messageSystemActions.updateValidMessages(categorizedValidMessages));

        const isSolanaRemoteFeatureEnabled = selectIsSolanaFeatureEnabled(getState());

        dispatch(
            setFeatureFlag({
                featureFlag: FeatureFlag.IsSolanaEnabledByRemote,
                value: isSolanaRemoteFeatureEnabled,
            }),
        );
    }

    return action;
});
