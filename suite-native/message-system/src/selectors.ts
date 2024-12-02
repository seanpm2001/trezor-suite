import {
    createMemoizedSelector,
    Feature,
    MessageSystemRootState,
    selectActiveFeatureMessages,
    selectIsFeatureEnabled,
} from '@suite-common/message-system';

export const selectActiveKillswitchMessages = createMemoizedSelector(
    [selectActiveFeatureMessages],
    messages =>
        messages.filter(m => {
            const killswitchFeatures = m.feature?.filter(
                item => item.domain === 'killswitch' && item?.flag,
            );

            return (killswitchFeatures?.length ?? 0) > 0;
        }),
);

export const selectIsSolanaFeatureEnabled = (state: MessageSystemRootState) =>
    selectIsFeatureEnabled(state, Feature.solanaMobile);
