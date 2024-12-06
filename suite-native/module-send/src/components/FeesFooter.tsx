import { useContext } from 'react';
import Animated, {
    FadeInDown,
    FadeOutDown,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import { useSelector } from 'react-redux';

import { type NetworkSymbol } from '@suite-common/wallet-config';
import { Text, Button, Card, HStack, VStack } from '@suite-native/atoms';
import {
    CryptoToFiatAmountFormatter,
    CryptoAmountFormatter,
    TokenAmountFormatter,
} from '@suite-native/formatters';
import { FormContext } from '@suite-native/forms';
import { prepareNativeStyle, useNativeStyles } from '@trezor/styles';
import { Translation } from '@suite-native/intl';
import { AccountKey, TokenAddress } from '@suite-common/wallet-types';
import {
    selectAccountTokenDecimals,
    selectAccountTokenSymbol,
    TokensRootState,
} from '@suite-native/tokens';

type FeesFooterProps = {
    accountKey: AccountKey;
    isSubmittable: boolean;
    onSubmit: () => void;
    symbol: NetworkSymbol;
    totalAmount: string;
    fee: string;
    tokenContract?: TokenAddress;
};

const CARD_BOTTOM_PADDING = 40;

const cardStyle = prepareNativeStyle(utils => ({
    width: '100%',
    paddingHorizontal: utils.spacings.sp8,
    backgroundColor: utils.colors.backgroundSurfaceElevationNegative,
    borderColor: utils.colors.borderElevation0,
    borderWidth: utils.borders.widths.small,
    ...utils.boxShadows.none,
}));

const buttonWrapperStyle = prepareNativeStyle(() => ({
    position: 'absolute',
    bottom: 0,
    width: '100%',
}));

const MainnetSummary = ({ amount, symbol }: { amount: string; symbol: NetworkSymbol }) => {
    return (
        <HStack justifyContent="space-between" alignItems="center">
            <Text variant="callout">
                <Translation id="moduleSend.fees.totalAmount" />
            </Text>
            <VStack spacing="sp4" alignItems="flex-end">
                <CryptoToFiatAmountFormatter
                    variant="callout"
                    color="textDefault"
                    value={amount}
                    symbol={symbol}
                />
                <CryptoAmountFormatter
                    variant="hint"
                    color="textSubdued"
                    value={amount}
                    symbol={symbol}
                    isBalance={false}
                />
            </VStack>
        </HStack>
    );
};

const TokenSummary = ({
    accountKey,
    tokenAmount,
    mainnetFee,
    symbol,
    tokenContract,
}: {
    accountKey: AccountKey;
    tokenAmount: string;
    mainnetFee: string;
    symbol: NetworkSymbol;
    tokenContract?: TokenAddress;
}) => {
    const tokenSymbol = useSelector((state: TokensRootState) =>
        selectAccountTokenSymbol(state, accountKey, tokenContract),
    );

    const tokenDecimals = useSelector((state: TokensRootState) =>
        selectAccountTokenDecimals(state, accountKey, tokenContract),
    );

    return (
        <HStack justifyContent="space-between" alignItems="center">
            <VStack spacing="sp4">
                <Text variant="callout">
                    <Translation id="moduleSend.review.outputs.amountLabel" />
                </Text>
                <Text variant="hint" color="textSubdued">
                    <Translation id="transactions.detail.feeLabel" />
                </Text>
            </VStack>
            <VStack spacing="sp4" alignItems="flex-end">
                <TokenAmountFormatter
                    variant="callout"
                    color="textDefault"
                    decimals={tokenDecimals ?? undefined}
                    value={tokenAmount}
                    tokenSymbol={tokenSymbol}
                />
                <CryptoAmountFormatter
                    variant="hint"
                    color="textSubdued"
                    value={mainnetFee}
                    symbol={symbol}
                    isBalance={false}
                />
            </VStack>
        </HStack>
    );
};

export const FeesFooter = ({
    accountKey,
    isSubmittable,
    onSubmit,
    totalAmount,
    fee,
    symbol,
    tokenContract,
}: FeesFooterProps) => {
    const { applyStyle } = useNativeStyles();

    const form = useContext(FormContext);
    const {
        formState: { isSubmitting },
    } = form;

    const animatedFooterStyle = useAnimatedStyle(
        () => ({
            paddingBottom: withTiming(isSubmittable ? CARD_BOTTOM_PADDING : 0),
        }),
        [isSubmittable],
    );

    return (
        <>
            <Card style={applyStyle(cardStyle)}>
                <Animated.View style={animatedFooterStyle}>
                    {tokenContract ? (
                        <TokenSummary
                            accountKey={accountKey}
                            tokenAmount={totalAmount}
                            mainnetFee={fee}
                            symbol={symbol}
                            tokenContract={tokenContract}
                        />
                    ) : (
                        <MainnetSummary amount={totalAmount} symbol={symbol} />
                    )}
                </Animated.View>
            </Card>
            {isSubmittable && (
                <Animated.View
                    style={applyStyle(buttonWrapperStyle)}
                    entering={FadeInDown}
                    exiting={FadeOutDown}
                >
                    <Button
                        accessibilityRole="button"
                        accessibilityLabel="validate send form"
                        testID="@send/fees-submit-button"
                        onPress={onSubmit}
                        disabled={isSubmitting}
                    >
                        <Translation id="moduleSend.fees.submitButton" />
                    </Button>
                </Animated.View>
            )}
        </>
    );
};
