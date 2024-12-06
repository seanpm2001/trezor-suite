import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { useAtomValue, useSetAtom } from 'jotai';

import { type NetworkSymbol } from '@suite-common/wallet-config';
import { AccountsRootState, selectAccountByKey } from '@suite-common/wallet-core';
import { AccountKey, TokenAddress, TokenSymbol } from '@suite-common/wallet-types';
import { DiscreetTextTrigger, VStack } from '@suite-native/atoms';
import { selectAccountTokenSymbol, TokensRootState } from '@suite-native/tokens';
import { GraphFiatBalance } from '@suite-native/graph';
import { selectIsHistoryEnabledAccountByAccountKey } from '@suite-native/graph/src/selectors';

import { AccountDetailCryptoValue } from './AccountDetailCryptoValue';
import {
    emptyGraphPoint,
    hasPriceIncreasedAtom,
    percentageChangeAtom,
    referencePointAtom,
    selectedPointAtom,
} from '../accountDetailGraphAtoms';

type AccountBalanceProps = {
    accountKey: AccountKey;
    tokenAddress?: TokenAddress;
};

const CryptoBalance = ({
    symbol,
    tokenSymbol,
    tokenAddress,
}: {
    symbol: NetworkSymbol;
    tokenSymbol?: TokenSymbol | null;
    tokenAddress?: TokenAddress;
}) => {
    const selectedPoint = useAtomValue(selectedPointAtom);

    return (
        <DiscreetTextTrigger>
            <AccountDetailCryptoValue
                symbol={symbol}
                tokenSymbol={tokenSymbol}
                tokenAddress={tokenAddress}
                value={selectedPoint.cryptoBalance}
            />
        </DiscreetTextTrigger>
    );
};

export const AccountDetailHeader = ({ accountKey, tokenAddress }: AccountBalanceProps) => {
    const account = useSelector((state: AccountsRootState) =>
        selectAccountByKey(state, accountKey),
    );
    const tokenSymbol = useSelector((state: TokensRootState) =>
        selectAccountTokenSymbol(state, accountKey, tokenAddress),
    );
    const isHistoryEnabledAccount = useSelector((state: AccountsRootState) =>
        selectIsHistoryEnabledAccountByAccountKey(state, accountKey),
    );
    const setPoint = useSetAtom(selectedPointAtom);

    // Reset selected point on unmount so that it doesn't display on device change
    useEffect(() => () => setPoint(emptyGraphPoint), [setPoint]);

    if (!account) return null;

    return (
        <VStack spacing="sp4" alignItems="center">
            <CryptoBalance
                symbol={account.symbol}
                tokenSymbol={tokenSymbol}
                tokenAddress={tokenAddress}
            />
            <GraphFiatBalance
                selectedPointAtom={selectedPointAtom}
                referencePointAtom={referencePointAtom}
                percentageChangeAtom={percentageChangeAtom}
                hasPriceIncreasedAtom={hasPriceIncreasedAtom}
                showChange={isHistoryEnabledAccount}
            />
        </VStack>
    );
};
