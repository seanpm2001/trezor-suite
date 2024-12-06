import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useSelector } from 'react-redux';

import {
    AccountsRootState,
    DeviceRootState,
    selectDeviceAccountByDescriptorAndNetworkSymbol,
} from '@suite-common/wallet-core';
import { ErrorMessage } from '@suite-native/atoms';
import { selectPortfolioTrackerNetworkSymbols } from '@suite-native/discovery';
import { FeatureFlag, useFeatureFlag } from '@suite-native/feature-flags';
import { Translation } from '@suite-native/intl';
import {
    AccountsImportStackParamList,
    AccountsImportStackRoutes,
    RootStackParamList,
    StackToTabCompositeScreenProps,
} from '@suite-native/navigation';

import { AccountAlreadyImportedScreen } from '../components/AccountAlreadyImportedScreen';
import { AccountImportConfirmFormScreen } from '../components/AccountImportConfirmFormScreen';

export const AccountImportSummaryScreen = ({
    route,
}: StackToTabCompositeScreenProps<
    AccountsImportStackParamList,
    AccountsImportStackRoutes.AccountImportSummary,
    RootStackParamList
>) => {
    const { accountInfo, networkSymbol } = route.params;

    const [isRegtestEnabled] = useFeatureFlag(FeatureFlag.IsRegtestEnabled);
    const account = useSelector((state: AccountsRootState & DeviceRootState) =>
        selectDeviceAccountByDescriptorAndNetworkSymbol(
            state,
            accountInfo.descriptor,
            networkSymbol,
        ),
    );
    const portfolioTrackerSupportedNetworks = useSelector(selectPortfolioTrackerNetworkSymbols);

    useEffect(() => {
        // prevent dismissing screen via HW
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            return true;
        });

        return () => subscription.remove();
    }, []);

    const isAccountImportSupported =
        portfolioTrackerSupportedNetworks.some(
            supportedSymbol => supportedSymbol === networkSymbol,
        ) ||
        (networkSymbol === 'regtest' && isRegtestEnabled);

    if (!isAccountImportSupported) {
        return (
            <ErrorMessage
                errorMessage={<Translation id="moduleAccountImport.error.unsupportedNetworkType" />}
            />
        );
    }

    if (account) {
        return <AccountAlreadyImportedScreen account={account} />;
    }

    return <AccountImportConfirmFormScreen symbol={networkSymbol} accountInfo={accountInfo} />;
};
