import { ReactNode } from 'react';
import { TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';

import { useNavigation } from '@react-navigation/native';

import { AccountKey, TransactionType, WalletAccountTransaction } from '@suite-common/wallet-types';
import { prepareNativeStyle, useNativeStyles } from '@trezor/styles';
import {
    RootStackParamList,
    RootStackRoutes,
    StackNavigationProps,
} from '@suite-native/navigation';
import { Badge, Box, DiscreetText, HStack, Text } from '@suite-native/atoms';
import { useFormatters } from '@suite-common/formatters';
import {
    selectIsPhishingTransaction,
    selectIsTransactionPending,
    selectTransactionBlockTimeById,
    selectTransactionByAccountKeyAndTxid,
    TransactionsRootState,
} from '@suite-common/wallet-core';
import { NetworkSymbol } from '@suite-common/wallet-config';
import { TypedTokenTransfer } from '@suite-native/tokens';
import { Color } from '@trezor/theme';
import { Translation } from '@suite-native/intl';
import { TokenDefinitionsRootState } from '@suite-common/token-definitions';

import { TransactionIcon } from './TransactionIcon';
import { TransactionName } from '../TransactionName';

type TransactionListItemContainerProps = {
    children: ReactNode;
    txid: string;
    accountKey: AccountKey;
    includedCoinsCount: number;
    isFirst?: boolean;
    isLast?: boolean;
    networkSymbol?: NetworkSymbol | undefined;
    tokenTransfer?: TypedTokenTransfer;
    transactionType: TransactionType;
};

type TransactionListItemStyleProps = {
    isFirst: boolean;
    isLast: boolean;
};

export const transactionListItemContainerStyle = prepareNativeStyle<TransactionListItemStyleProps>(
    (utils, { isFirst, isLast }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: utils.colors.backgroundSurfaceElevation1,
        marginHorizontal: utils.spacings.sp16,
        paddingHorizontal: utils.spacings.sp16,
        paddingTop: utils.spacings.sp12,
        paddingBottom: utils.spacings.sp12,
        extend: [
            {
                condition: isFirst,
                style: {
                    paddingTop: utils.spacings.sp16,
                    borderTopLeftRadius: utils.borders.radii.r12,
                    borderTopRightRadius: utils.borders.radii.r12,
                },
            },
            {
                condition: isLast,
                style: {
                    paddingBottom: utils.spacings.sp16,
                    marginBottom: utils.spacings.sp8,
                    borderBottomLeftRadius: utils.borders.radii.r12,
                    borderBottomRightRadius: utils.borders.radii.r12,
                },
            },
        ],
    }),
);

const titleStyle = prepareNativeStyle(utils => ({
    flexDirection: 'row',
    gap: utils.spacings.sp8,
}));

const descriptionBoxStyle = prepareNativeStyle(_ => ({
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
}));

export const valuesContainerStyle = prepareNativeStyle(utils => ({
    flexShrink: 0,
    alignItems: 'flex-end',
    marginLeft: utils.spacings.sp8,
    maxWidth: '40%',
}));

export const TransactionListItemContainer = ({
    children,
    txid,
    accountKey,
    isFirst = false,
    isLast = false,
    includedCoinsCount,
    transactionType,
    networkSymbol,
    tokenTransfer,
}: TransactionListItemContainerProps) => {
    const { applyStyle } = useNativeStyles();
    const navigation =
        useNavigation<StackNavigationProps<RootStackParamList, RootStackRoutes.AccountDetail>>();

    const handleNavigateToTransactionDetail = () => {
        navigation.navigate(RootStackRoutes.TransactionDetail, {
            txid,
            accountKey,
            tokenContract: tokenTransfer?.contract,
        });
    };

    const hasIncludedCoins = includedCoinsCount > 0;
    const includedCoinsLabel = `+${includedCoinsCount} coin${includedCoinsCount > 1 ? 's' : ''}`;

    const { DateTimeFormatter } = useFormatters();
    const transaction = useSelector((state: TransactionsRootState) =>
        selectTransactionByAccountKeyAndTxid(state, accountKey, txid),
    ) as WalletAccountTransaction;
    const transactionBlockTime = useSelector((state: TransactionsRootState) =>
        selectTransactionBlockTimeById(state, accountKey, txid),
    );

    const isTransactionPending = useSelector((state: TransactionsRootState) =>
        selectIsTransactionPending(state, txid, accountKey),
    );

    const isPhishingTransaction = useSelector(
        (state: TokenDefinitionsRootState & TransactionsRootState) =>
            selectIsPhishingTransaction(state, txid, accountKey),
    );

    const iconColor: Color = isTransactionPending ? 'backgroundAlertYellowBold' : 'iconSubdued';
    const coinSymbol = isPhishingTransaction ? undefined : networkSymbol;
    const contractAddress = isPhishingTransaction ? undefined : tokenTransfer?.contract;

    const DateTextComponent = isPhishingTransaction ? DiscreetText : Text;

    return (
        <TouchableOpacity
            onPress={() => handleNavigateToTransactionDetail()}
            style={applyStyle(transactionListItemContainerStyle, { isFirst, isLast })}
        >
            <Box style={applyStyle(descriptionBoxStyle)}>
                <TransactionIcon
                    networkSymbol={coinSymbol}
                    contractAddress={contractAddress}
                    transactionType={transactionType}
                    isAnimated={isTransactionPending}
                    iconColor={iconColor}
                />
                <Box marginLeft="sp16" flex={1}>
                    <HStack flexDirection="row" alignItems="center" spacing="sp4">
                        <Box style={applyStyle(titleStyle)}>
                            <Text variant="body">
                                <TransactionName
                                    transaction={transaction}
                                    isPending={isTransactionPending}
                                />
                            </Text>
                            {isPhishingTransaction && (
                                <Badge
                                    label={<Translation id="transactions.phishing.badge" />}
                                    size="small"
                                    icon="warning"
                                    variant="red"
                                />
                            )}
                        </Box>
                        {hasIncludedCoins && <Badge label={includedCoinsLabel} size="small" />}
                    </HStack>

                    <DateTextComponent
                        isForcedDiscreetMode={isPhishingTransaction}
                        variant="hint"
                        color="textSubdued"
                    >
                        {DateTimeFormatter.format(transactionBlockTime)}
                    </DateTextComponent>
                </Box>
            </Box>
            <Box style={applyStyle(valuesContainerStyle)}>{children}</Box>
        </TouchableOpacity>
    );
};
