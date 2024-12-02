import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { isAndroid } from '@trezor/env-utils';
import { isDebugEnv, isDetoxTestBuild, isDevelopOrDebugEnv } from '@suite-native/config';

export const FeatureFlag = {
    IsDeviceConnectEnabled: 'isDeviceConnectEnabled',
    IsRippleSendEnabled: 'isRippleSendEnabled',
    IsCardanoSendEnabled: 'isCardanoSendEnabled',
    IsRegtestEnabled: 'isRegtestEnabled',
    IsSolanaEnabled: 'IsSolanaEnabled',
    IsSolanaEnabledByRemote: 'IsSolanaEnabledByRemote', // should be updated only via message system
    IsConnectPopupEnabled: 'IsConnectPopupEnabled',
} as const;
export type FeatureFlag = (typeof FeatureFlag)[keyof typeof FeatureFlag];

export type FeatureFlagsState = Record<FeatureFlag, boolean>;

export type FeatureFlagsRootState = {
    featureFlags: FeatureFlagsState;
};

export const featureFlagsInitialState: FeatureFlagsState = {
    [FeatureFlag.IsDeviceConnectEnabled]: isAndroid() || isDebugEnv(),
    [FeatureFlag.IsRippleSendEnabled]: isAndroid() && isDevelopOrDebugEnv(),
    [FeatureFlag.IsCardanoSendEnabled]: isAndroid() && isDevelopOrDebugEnv(),
    [FeatureFlag.IsRegtestEnabled]: isDebugEnv() || isDetoxTestBuild(),
    [FeatureFlag.IsSolanaEnabled]: false,
    [FeatureFlag.IsSolanaEnabledByRemote]: false,
    [FeatureFlag.IsConnectPopupEnabled]: isDevelopOrDebugEnv(),
};

export const featureFlagsPersistedKeys: Array<keyof FeatureFlagsState> = [
    FeatureFlag.IsDeviceConnectEnabled,
    FeatureFlag.IsRippleSendEnabled,
    FeatureFlag.IsCardanoSendEnabled,
    FeatureFlag.IsRegtestEnabled,
    FeatureFlag.IsSolanaEnabled,
    FeatureFlag.IsSolanaEnabledByRemote,
    FeatureFlag.IsConnectPopupEnabled,
];

export const featureFlagsSlice = createSlice({
    name: 'featureFlags',
    initialState: featureFlagsInitialState,
    reducers: {
        toggleFeatureFlag: (state, { payload }: PayloadAction<{ featureFlag: FeatureFlag }>) => {
            state[payload.featureFlag] = !state[payload.featureFlag];
        },
        setFeatureFlag: (
            state,
            { payload }: PayloadAction<{ featureFlag: FeatureFlag; value: boolean }>,
        ) => {
            state[payload.featureFlag] = payload.value;
        },
    },
});

export const createSelectIsFeatureFlagEnabled =
    (featureFlagKey: FeatureFlag) => (state: FeatureFlagsRootState) =>
        state.featureFlags[featureFlagKey];

export const selectIsFeatureFlagEnabled = (state: FeatureFlagsRootState, key: FeatureFlag) =>
    state.featureFlags[key];

export const selectIsSolanaEnabled = (state: FeatureFlagsRootState) =>
    state.featureFlags[FeatureFlag.IsSolanaEnabledByRemote] ||
    state.featureFlags[FeatureFlag.IsSolanaEnabled];

export const { toggleFeatureFlag, setFeatureFlag } = featureFlagsSlice.actions;
export const featureFlagsReducer = featureFlagsSlice.reducer;
