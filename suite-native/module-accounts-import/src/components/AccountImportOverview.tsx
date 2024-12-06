import { getNetwork, type NetworkSymbol } from '@suite-common/wallet-config';
import {
    CryptoAmountFormatter,
    FiatBalanceFormatter,
    useFiatFromCryptoValue,
} from '@suite-native/formatters';
import { RoundedIcon, VStack } from '@suite-native/atoms';
import { isTestnet } from '@suite-common/wallet-utils';
import { TextInputField } from '@suite-native/forms';

import { AccountImportOverviewCard } from './AccountImportOverviewCard';

type AssetsOverviewProps = {
    balance: string;
    symbol: NetworkSymbol;
};

export const AccountImportOverview = ({ balance, symbol }: AssetsOverviewProps) => {
    const fiatBalanceValue = useFiatFromCryptoValue({
        cryptoValue: balance,
        symbol,
    });

    return (
        <AccountImportOverviewCard
            icon={<RoundedIcon symbol={symbol} iconSize="large" />}
            coinName={getNetwork(symbol).name}
            cryptoAmount={
                <CryptoAmountFormatter
                    value={balance}
                    symbol={symbol}
                    isDiscreetText={false}
                    isBalance={false}
                    variant="label"
                />
            }
        >
            <VStack spacing="sp24">
                {!isTestnet(symbol) && <FiatBalanceFormatter value={fiatBalanceValue} />}
                <TextInputField
                    testID="@account-import/coin-synced/label-input"
                    name="accountLabel"
                    label="Coin label"
                    elevation="1"
                />
            </VStack>
        </AccountImportOverviewCard>
    );
};
