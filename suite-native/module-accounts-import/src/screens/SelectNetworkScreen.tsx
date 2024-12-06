import {
    AccountsImportStackParamList,
    AccountsImportStackRoutes,
    Screen,
    StackProps,
} from '@suite-native/navigation';
import { type NetworkSymbol } from '@suite-common/wallet-config';

import { AccountImportSubHeader } from '../components/AccountImportSubHeader';
import { SelectableNetworkList } from '../components/SelectableNetworkList';

export const SelectNetworkScreen = ({
    navigation,
}: StackProps<AccountsImportStackParamList, AccountsImportStackRoutes.SelectNetwork>) => {
    const handleSelectNetworkSymbol = (symbol: NetworkSymbol) => {
        navigation.navigate(AccountsImportStackRoutes.XpubScan, {
            networkSymbol: symbol,
        });
    };

    return (
        <Screen screenHeader={<AccountImportSubHeader />} customHorizontalPadding="sp16">
            <SelectableNetworkList onSelectItem={handleSelectNetworkSymbol} />
        </Screen>
    );
};
