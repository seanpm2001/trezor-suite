import { useCallback } from 'react';

import { getTitleForNetwork, getTitleForCoinjoinAccount } from '@suite-common/wallet-utils';
import { AccountType, NetworkSymbol } from '@suite-common/wallet-config';

import { useTranslation } from './useTranslation';

export interface GetDefaultAccountLabelParams {
    accountType: AccountType;
    symbol: NetworkSymbol;
    index?: number;
}

export const useDefaultAccountLabel = () => {
    const { translationString } = useTranslation();

    const getDefaultAccountLabel = useCallback(
        ({ accountType, symbol, index = 0 }: GetDefaultAccountLabelParams): string => {
            if (accountType === 'coinjoin') {
                return translationString(getTitleForCoinjoinAccount(symbol));
            }

            const displayedAccountNumber = index + 1;

            return translationString('LABELING_ACCOUNT', {
                networkName: translationString(getTitleForNetwork(symbol)), // Bitcoin, Ethereum, ...
                index: displayedAccountNumber,
            });
        },
        [translationString],
    );

    return {
        getDefaultAccountLabel,
    };
};
