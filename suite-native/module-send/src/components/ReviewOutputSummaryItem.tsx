import { useSelector } from 'react-redux';
import { LayoutChangeEvent, View } from 'react-native';

import { NetworkSymbol } from '@suite-common/wallet-config';
import { AccountsRootState, DeviceRootState, SendRootState } from '@suite-common/wallet-core';
import { AccountKey, TokenAddress } from '@suite-common/wallet-types';
import { VStack } from '@suite-native/atoms';
import { useTranslate } from '@suite-native/intl';
import { BigNumber } from '@trezor/utils';
import { isCoinWithTokens } from '@suite-native/tokens';

import { selectReviewSummaryOutput } from '../selectors';
import { ReviewOutputItemValues } from './ReviewOutputItemValues';
import { ReviewOutputCard } from './ReviewOutputCard';

type ReviewOutputSummaryItemProps = {
    accountKey: AccountKey;
    networkSymbol: NetworkSymbol;
    onLayout: (event: LayoutChangeEvent) => void;
    tokenContract?: TokenAddress;
};

type ValuesProps = {
    totalSpent: string;
    fee: string;
    networkSymbol: NetworkSymbol;
    tokenContract?: TokenAddress;
};

const BitcoinValues = ({ totalSpent, fee, networkSymbol }: ValuesProps) => {
    return (
        <>
            <ReviewOutputItemValues
                value={totalSpent}
                networkSymbol={networkSymbol}
                translationKey="moduleSend.review.outputs.summary.totalAmount"
            />
            <ReviewOutputItemValues
                value={fee}
                networkSymbol={networkSymbol}
                translationKey="moduleSend.review.outputs.summary.fee"
            />
        </>
    );
};

const TokenEnabledValues = ({ totalSpent, fee, tokenContract, networkSymbol }: ValuesProps) => {
    const amount = tokenContract ? totalSpent : BigNumber(totalSpent).minus(fee).toString();

    return (
        <>
            <ReviewOutputItemValues
                value={amount}
                tokenContract={tokenContract}
                networkSymbol={networkSymbol}
                translationKey="moduleSend.review.outputs.summary.amount"
            />
            <ReviewOutputItemValues
                value={fee}
                networkSymbol={networkSymbol}
                translationKey="moduleSend.review.outputs.summary.maxFee"
            />
        </>
    );
};

export const ReviewOutputSummaryItem = ({
    accountKey,
    networkSymbol,
    tokenContract,
    onLayout,
}: ReviewOutputSummaryItemProps) => {
    const { translate } = useTranslate();
    const summaryOutput = useSelector(
        (state: AccountsRootState & DeviceRootState & SendRootState) =>
            selectReviewSummaryOutput(state, accountKey, tokenContract),
    );

    if (!summaryOutput) return null;

    const { state, totalSpent, fee } = summaryOutput;

    const canHaveTokens = isCoinWithTokens(networkSymbol);

    return (
        <View onLayout={onLayout}>
            <ReviewOutputCard
                title={translate('moduleSend.review.outputs.summary.label')}
                outputState={state}
            >
                <VStack spacing="sp16">
                    {canHaveTokens ? (
                        <TokenEnabledValues
                            totalSpent={totalSpent}
                            fee={fee}
                            networkSymbol={networkSymbol}
                            tokenContract={tokenContract}
                        />
                    ) : (
                        <BitcoinValues
                            totalSpent={totalSpent}
                            fee={fee}
                            networkSymbol={networkSymbol}
                        />
                    )}
                </VStack>
            </ReviewOutputCard>
        </View>
    );
};
