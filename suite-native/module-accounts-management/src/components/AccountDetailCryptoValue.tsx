import { memo } from 'react';

import { HStack } from '@suite-native/atoms';
import { CryptoAmountFormatter, TokenAmountFormatter } from '@suite-native/formatters';
import { CryptoIcon } from '@suite-native/icons';
import { NetworkSymbol } from '@suite-common/wallet-config';
import { TokenAddress, TokenSymbol } from '@suite-common/wallet-types';

type AccountDetailBalanceProps = {
    value: string;
    networkSymbol: NetworkSymbol;
    isBalance?: boolean;
    tokenSymbol?: TokenSymbol | null;
    tokenAddress?: TokenAddress;
};

export const AccountDetailCryptoValue = memo(
    ({
        value,
        networkSymbol,
        tokenSymbol,
        tokenAddress,
        isBalance = true,
    }: AccountDetailBalanceProps) => (
        <HStack spacing="sp8" flexDirection="row" alignItems="center" justifyContent="center">
            <CryptoIcon symbol={networkSymbol} contractAddress={tokenAddress} size="extraSmall" />

            {tokenSymbol ? (
                <TokenAmountFormatter
                    value={value}
                    tokenSymbol={tokenSymbol}
                    adjustsFontSizeToFit
                />
            ) : (
                <CryptoAmountFormatter
                    value={value}
                    network={networkSymbol}
                    isBalance={isBalance}
                    adjustsFontSizeToFit
                />
            )}
        </HStack>
    ),
);

AccountDetailCryptoValue.displayName = 'AccountDetailCryptoValue';
