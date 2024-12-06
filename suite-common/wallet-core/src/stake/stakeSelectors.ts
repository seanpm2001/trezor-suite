import { type NetworkSymbol } from '@suite-common/wallet-config';
import { BACKUP_ETH_APY } from '@suite-common/wallet-constants';

import { StakeRootState } from './stakeReducer';

export const selectEverstakeData = (
    state: StakeRootState,
    symbol: NetworkSymbol,
    endpointType: 'poolStats' | 'validatorsQueue',
) => state.wallet.stake?.data?.[symbol]?.[endpointType];

export const selectPoolStatsApyData = (state: StakeRootState, symbol?: NetworkSymbol) => {
    if (!symbol) {
        return BACKUP_ETH_APY;
    }

    return state.wallet.stake?.data?.[symbol]?.poolStats.data.ethApy || BACKUP_ETH_APY;
};

export const selectPoolStatsNextRewardPayout = (state: StakeRootState, symbol?: NetworkSymbol) => {
    if (!symbol) {
        return undefined;
    }

    return state.wallet.stake?.data?.[symbol]?.poolStats.data?.nextRewardPayout;
};

export const selectValidatorsQueueData = (state: StakeRootState, symbol?: NetworkSymbol) => {
    if (!symbol) {
        return {};
    }

    return state.wallet.stake?.data?.[symbol]?.validatorsQueue.data || {};
};

export const selectValidatorsQueue = (state: StakeRootState, symbol?: NetworkSymbol) => {
    if (!symbol) {
        return undefined;
    }

    return state.wallet.stake?.data?.[symbol]?.validatorsQueue;
};
