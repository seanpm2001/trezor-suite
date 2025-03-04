import { Box, PictogramTitleHeader } from '@suite-native/atoms';
import { prepareNativeStyle, useNativeStyles } from '@trezor/styles';

const overlayStyle = prepareNativeStyle(utils => ({
    justifyContent: 'center',
    alignItems: 'center',
    padding: utils.spacings.sp16,
}));

export const XpubOverlayWarning = () => {
    const { applyStyle } = useNativeStyles();

    return (
        <Box style={applyStyle(overlayStyle)}>
            <PictogramTitleHeader
                variant="warning"
                title="Handle your public key (XPUB) with caution"
                subtitle="Sharing your public key (XPUB) with a third party gives them the ability to
                        view your transaction history."
            />
        </Box>
    );
};
