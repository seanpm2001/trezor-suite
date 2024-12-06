import { useCallback } from 'react';

import { getNetworkType, type NetworkSymbol } from '@suite-common/wallet-config';
import { useAlert } from '@suite-native/alerts';
import {
    AccountsImportStackParamList,
    AccountsImportStackRoutes,
    RootStackParamList,
    RootStackRoutes,
    StackToStackCompositeNavigationProps,
} from '@suite-native/navigation';
import { IconName } from '@suite-native/icons';

type AlertError = 'invalidXpub' | 'invalidReceiveAddress' | 'networkError' | 'unknownError';
type AlertErrorOptions = {
    title: string;
    description: string;
    icon?: IconName;
};

const alertErrorMap: Record<AlertError, AlertErrorOptions> = {
    invalidXpub: {
        title: 'Invalid Public address (XPUB)',
        description: 'Check and correct the public address (XPUB).',
    },
    invalidReceiveAddress: {
        title: 'Receive address invalid',
        description: 'Check and correct the receive address.',
    },
    networkError: {
        title: 'Network error',
        description:
            'We were unable to retrieve the data from the blockchain due to a network error.',
        icon: 'wifiX',
    },
    unknownError: {
        title: 'Something went wrong',
        description: 'We are unable to gather the data right now. Please try again.',
    },
};

type NavigationProp = StackToStackCompositeNavigationProps<
    AccountsImportStackParamList,
    AccountsImportStackRoutes.AccountImportLoading,
    RootStackParamList
>;

export const useShowImportError = (symbol: NetworkSymbol, navigation: NavigationProp) => {
    const { showAlert } = useAlert();

    const showImportError = useCallback(
        (message?: string, onRetry?: () => void) => {
            let alertError: AlertError = 'unknownError';

            if (message) {
                const lowerCasedMessage = message.toLowerCase();
                const networkType = getNetworkType(symbol);

                if (lowerCasedMessage.includes('invalid address')) {
                    if (networkType === 'bitcoin' || networkType === 'cardano') {
                        alertError = 'invalidXpub';
                    } else {
                        alertError = 'invalidReceiveAddress';
                    }
                } else if (lowerCasedMessage.includes('network')) {
                    alertError = 'networkError';
                }
            }

            const handleGoBack = () =>
                navigation.navigate(RootStackRoutes.AccountsImport, {
                    screen: AccountsImportStackRoutes.XpubScan,
                    params: {
                        networkSymbol: symbol,
                    },
                });

            const { title, description, icon } = alertErrorMap[alertError];

            if (onRetry) {
                showAlert({
                    title,
                    description,
                    icon,
                    pictogramVariant: 'critical',
                    primaryButtonTitle: 'Try Again',
                    onPressPrimaryButton: onRetry,
                    secondaryButtonTitle: 'Go back',
                    onPressSecondaryButton: handleGoBack,
                });
            } else {
                showAlert({
                    title,
                    description,
                    icon,
                    pictogramVariant: 'critical',
                    primaryButtonTitle: 'Go back',
                    onPressPrimaryButton: handleGoBack,
                    testID: `@alert-sheet/error/${alertError}`,
                });
            }
        },
        [symbol, showAlert, navigation],
    );

    return showImportError;
};
