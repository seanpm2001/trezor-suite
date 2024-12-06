import { D, pipe } from '@mobily/ts-belt';

import { type NetworkSymbol, getNetworkType, networks } from '@suite-common/wallet-config';
import {
    FeatureFlagsRootState,
    selectIsFeatureFlagEnabled,
    FeatureFlag,
} from '@suite-native/feature-flags';

const PRODUCTION_SEND_COINS_WHITELIST = pipe(
    networks,
    D.filter(network => network.networkType === 'bitcoin' || network.networkType === 'ethereum'),
    D.keys,
);

export const selectIsNetworkSendFlowEnabled = (
    state: FeatureFlagsRootState,
    symbol?: NetworkSymbol,
) => {
    if (!symbol) return false;
    const networkType = getNetworkType(symbol);

    if (PRODUCTION_SEND_COINS_WHITELIST.includes(symbol)) return true;

    const isRippleSendEnabled = selectIsFeatureFlagEnabled(state, FeatureFlag.IsRippleSendEnabled);

    if (isRippleSendEnabled && networkType === 'ripple') return true;

    const isCardanoSendEnabled = selectIsFeatureFlagEnabled(
        state,
        FeatureFlag.IsCardanoSendEnabled,
    );

    if (isCardanoSendEnabled && networkType === 'cardano') return true;

    const isSolanaSendEnabled = selectIsFeatureFlagEnabled(state, FeatureFlag.IsSolanaSendEnabled);

    if (isSolanaSendEnabled && networkType === 'solana') return true;

    return false;
};
