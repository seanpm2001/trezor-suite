import { useDispatch, useSelector } from 'react-redux';

import { A, G } from '@mobily/ts-belt';

import { Box, Button, PictogramTitleHeader, VStack } from '@suite-native/atoms';
import { prepareNativeStyle, useNativeStyles } from '@trezor/styles';
import { messageSystemActions, selectActiveFeatureMessages } from '@suite-common/message-system';
import { Translation } from '@suite-native/intl';
import { useOpenLink } from '@suite-native/link';

const screenStyle = prepareNativeStyle(utils => ({
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: utils.spacings.sp24,
    paddingTop: utils.spacings.sp64,
    paddingBottom: utils.spacings.sp32,
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: utils.colors.backgroundSurfaceElevation0,
}));

const contentStyle = prepareNativeStyle(_ => ({
    flexGrow: 1,
    justifyContent: 'center',
}));

const buttonsWrapperStyle = prepareNativeStyle(_ => ({
    width: '100%',
}));

export const FeatureMessageScreen = () => {
    const dispatch = useDispatch();
    const openLink = useOpenLink();

    const activeFeatureMessages = useSelector(selectActiveFeatureMessages);
    const firstFeatureMessage = A.head(activeFeatureMessages);

    const { applyStyle } = useNativeStyles();

    if (!firstFeatureMessage) return null;

    const {
        id: messageId,
        variant,
        headline,
        content,
        cta,
        dismissible: isDismissable,
        category,
        feature,
    } = firstFeatureMessage;

    const isKillswitch = A.isNotEmpty(
        feature?.filter(item => item.domain === 'killswitch' && item.flag) ?? [],
    );

    // TODO: We use only English locale in suite-native so far. When the localization to other
    // languages is implemented, the language selection logic has to be added here.
    const messageTitle = headline?.en;
    const messageContent = content.en;
    const ctaLabel = cta?.label.en;
    const ctaLink = cta?.link;
    const isExternalCta = cta?.action === 'external-link';

    const handleCtaPress = () => {
        if (isExternalCta && ctaLink) {
            openLink(ctaLink);
        } else {
            // TODO: handle internal link once we introduce them
        }
    };

    const isCtaVisible = ctaLabel && ctaLink;

    const handleDismiss = () => {
        if (!isDismissable) return;

        const categories = G.isArray(category) ? category : [category];
        categories.forEach(item => {
            dispatch(
                messageSystemActions.dismissMessage({
                    id: messageId,
                    category: item,
                }),
            );
        });
    };

    const defaultTitle = isKillswitch ? (
        <Translation id="messageSystem.killswitch.title" />
    ) : undefined;
    const defaultContent = isKillswitch ? (
        <Translation id="messageSystem.killswitch.content" />
    ) : undefined;

    return (
        <Box style={applyStyle(screenStyle)}>
            <Box style={applyStyle(contentStyle)}>
                <PictogramTitleHeader
                    variant={variant}
                    title={messageTitle ?? defaultTitle}
                    subtitle={messageContent ?? defaultContent}
                    titleVariant="titleMedium"
                />
            </Box>
            <VStack spacing="sp16" style={applyStyle(buttonsWrapperStyle)}>
                {isCtaVisible && (
                    <Button size="large" colorScheme="primary" onPress={handleCtaPress}>
                        {ctaLabel}
                    </Button>
                )}
                {isDismissable && (
                    <Button size="large" colorScheme="tertiaryElevation0" onPress={handleDismiss}>
                        <Translation id="generic.buttons.dismiss" />
                    </Button>
                )}
            </VStack>
        </Box>
    );
};
