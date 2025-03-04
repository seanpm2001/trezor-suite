import Animated, { FadeInDown, FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Pressable } from 'react-native';

import { prepareNativeStyle, useNativeStyles } from '@trezor/styles';
import { Icon } from '@suite-native/icons';
import { Text, VStack } from '@suite-native/atoms';
import { Translation } from '@suite-native/intl';

type GraphErrorProps = {
    error: string;
    onTryAgain: () => void;
};

const errorIconStyle = prepareNativeStyle(({ borders, colors }) => ({
    width: 48,
    height: 48,
    borderRadius: borders.radii.round,
    backgroundColor: colors.backgroundAlertYellowSubtleOnElevation1,
    borderColor: colors.backgroundAlertYellowSubtleOnElevation0,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
}));

const tryAgainButtonStyle = prepareNativeStyle(({ spacings }) => ({
    marginTop: spacings.sp8,
}));

const ErrorIcon = () => {
    const { applyStyle } = useNativeStyles();

    return (
        <Animated.View style={applyStyle(errorIconStyle)} entering={FadeInUp} exiting={FadeInDown}>
            <Icon name="warning" color="iconAlertYellow" />
        </Animated.View>
    );
};

export const GraphError = ({ error, onTryAgain }: GraphErrorProps) => {
    const { applyStyle } = useNativeStyles();

    return (
        <VStack spacing="sp8" alignItems="center" paddingHorizontal="sp16">
            <ErrorIcon />
            <Animated.View entering={FadeInDown} exiting={FadeOutUp}>
                <Text variant="hint" color="textSubdued" textAlign="center">
                    <Translation id="graph.errorMessage" />
                    {error}
                </Text>
                <Pressable onPress={onTryAgain}>
                    <Text
                        variant="body"
                        color="textSecondaryHighlight"
                        style={applyStyle(tryAgainButtonStyle)}
                        textAlign="center"
                    >
                        <Translation id="graph.tryAgain" />
                    </Text>
                </Pressable>
            </Animated.View>
        </VStack>
    );
};
