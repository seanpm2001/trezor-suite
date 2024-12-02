import { D, pipe } from '@mobily/ts-belt';

import { MessageSystemRootState } from '@suite-common/message-system';
import { NetworkSymbol, getNetworkType, networks } from '@suite-common/wallet-config';
import {
    FeatureFlagsRootState,
    selectIsFeatureFlagEnabled,
    FeatureFlag,
    selectIsSolanaEnabled,
} from '@suite-native/feature-flags';

const PRODUCTION_SEND_COINS_WHITELIST = pipe(
    networks,
    D.filter(network => network.networkType === 'bitcoin' || network.networkType === 'ethereum'),
    D.keys,
);

export const selectIsNetworkSendFlowEnabled = (
    state: FeatureFlagsRootState & MessageSystemRootState,
    networkSymbol?: NetworkSymbol,
) => {
    if (!networkSymbol) return false;
    const networkType = getNetworkType(networkSymbol);

    if (PRODUCTION_SEND_COINS_WHITELIST.includes(networkSymbol)) return true;

    const isRippleSendEnabled = selectIsFeatureFlagEnabled(state, FeatureFlag.IsRippleSendEnabled);

    if (isRippleSendEnabled && networkType === 'ripple') return true;

    const isCardanoSendEnabled = selectIsFeatureFlagEnabled(
        state,
        FeatureFlag.IsCardanoSendEnabled,
    );

    if (isCardanoSendEnabled && networkType === 'cardano') return true;

    const isSolanaEnabled = selectIsSolanaEnabled(state);

    if (isSolanaEnabled && networkType === 'solana') return true;

    return false;
};
