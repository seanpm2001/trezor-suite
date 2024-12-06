import { CryptoIcon } from '@suite-native/icons';
import { getNetwork, type NetworkSymbol } from '@suite-common/wallet-config';
import { Card, HStack, Text } from '@suite-native/atoms';
import { Translation } from '@suite-native/intl';
import { Link } from '@suite-native/link';
import { prepareNativeStyle, useNativeStyles } from '@trezor/styles';
import { isCoinWithTokens } from '@suite-native/tokens';

const cardStyle = prepareNativeStyle(utils => ({
    backgroundColor: utils.colors.backgroundTertiaryDefaultOnElevation0,
    borderColor: utils.colors.borderElevation0,
    borderWidth: utils.borders.widths.small,
    paddingVertical: utils.spacings.sp12,

    ...utils.boxShadows.none,
}));

type CorrectNetworkMessageCardProps = {
    symbol: NetworkSymbol;
};

const LINK_URL = 'https://trezor.io/learn/a/how-to-choose-the-right-network';

export const CorrectNetworkMessageCard = ({ symbol }: CorrectNetworkMessageCardProps) => {
    const { applyStyle } = useNativeStyles();

    if (!isCoinWithTokens(symbol)) return null;

    const networkName = getNetwork(symbol).name;

    return (
        <Card style={applyStyle(cardStyle)}>
            <HStack spacing="sp12">
                <CryptoIcon symbol={symbol} size={20} />
                <Text variant="hint">
                    <Translation
                        id="moduleSend.outputs.correctNetworkMessage"
                        values={{
                            networkName,
                            link: linkChunk => (
                                <Link
                                    href={LINK_URL}
                                    label={linkChunk}
                                    isUnderlined
                                    textVariant="hint"
                                    textColor="textDefault"
                                />
                            ),
                        }}
                    />
                </Text>
            </HStack>
        </Card>
    );
};
