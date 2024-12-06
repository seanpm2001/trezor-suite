import { Box, Card, CheckBox, Text, VStack } from '@suite-native/atoms';
import { FeatureFlag as FeatureFlagEnum, useFeatureFlag } from '@suite-native/feature-flags';

const featureFlagsTitleMap = {
    [FeatureFlagEnum.IsDeviceConnectEnabled]: 'Connect device',
    [FeatureFlagEnum.IsRippleSendEnabled]: 'Ripple send',
    [FeatureFlagEnum.IsCardanoSendEnabled]: 'Cardano send',
    [FeatureFlagEnum.IsRegtestEnabled]: 'Regtest',
    [FeatureFlagEnum.IsSolanaEnabled]: 'Solana',
    [FeatureFlagEnum.IsSolanaEnabledByRemote]: 'Hidden in UI',
    [FeatureFlagEnum.IsConnectPopupEnabled]: 'Connect Popup',
} as const satisfies Record<FeatureFlagEnum, string>;

const FeatureFlag = ({ featureFlag }: { featureFlag: FeatureFlagEnum }) => {
    const [value, setValue] = useFeatureFlag(featureFlag);

    return (
        <Box flexDirection="row" justifyContent="space-between">
            <Text>{featureFlagsTitleMap[featureFlag]}</Text>
            <CheckBox isChecked={value} onChange={setValue} />
        </Box>
    );
};

export const FeatureFlags = () => {
    const adjustableFeatureFlags = Object.values(FeatureFlagEnum).filter(
        f => f !== FeatureFlagEnum.IsSolanaEnabledByRemote,
    );

    return (
        <Card>
            <VStack spacing="sp8">
                <Text variant="titleSmall">Feature Flags</Text>
                <VStack>
                    {adjustableFeatureFlags.map(featureFlag => (
                        <FeatureFlag key={featureFlag} featureFlag={featureFlag} />
                    ))}
                </VStack>
            </VStack>
        </Card>
    );
};
