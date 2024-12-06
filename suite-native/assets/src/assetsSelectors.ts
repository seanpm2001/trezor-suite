import { A, F, G, pipe } from '@mobily/ts-belt';

import { calculateAssetsPercentage } from '@suite-common/assets';
import { createWeakMapSelector } from '@suite-common/redux-utils';
import {
    getSimpleCoinDefinitionsByNetwork,
    selectTokenDefinitions,
    TokenDefinitionsRootState,
} from '@suite-common/token-definitions';
import { type NetworkSymbol, networkSymbolCollection } from '@suite-common/wallet-config';
import {
    AccountsRootState,
    DeviceRootState,
    FiatRatesRootState,
    selectCurrentFiatRates,
    selectDeviceAccounts,
    selectVisibleDeviceAccounts,
    selectVisibleDeviceAccountsByNetworkSymbol,
} from '@suite-common/wallet-core';
import { getAccountFiatBalance } from '@suite-common/wallet-utils';
import { getAccountListSections } from '@suite-native/accounts';
import { sortAccountsByNetworksAndAccountTypes } from '@suite-native/accounts/src/utils';
import { selectFiatCurrencyCode, SettingsSliceRootState } from '@suite-native/settings';
import { getAccountCryptoBalanceWithStaking, NativeStakingRootState } from '@suite-native/staking';

export interface AssetType {
    symbol: NetworkSymbol;
    assetBalance: string;
    fiatBalance: string | null;
}

export type AssetsRootState = AccountsRootState &
    FiatRatesRootState &
    SettingsSliceRootState &
    TokenDefinitionsRootState &
    NativeStakingRootState &
    DeviceRootState;

const createMemoizedSelector = createWeakMapSelector.withTypes<AssetsRootState>();

/*
We do not memoize most of following selectors because they are using only with `useSelectorDeepComparison` hook which is faster than memoization.
TODO: revalidate if this is still true for reselect
*/

export const selectVisibleDeviceAccountsKeysByNetworkSymbol = (
    state: AssetsRootState,
    symbol: NetworkSymbol | null,
) => {
    if (G.isNull(symbol)) return [];

    const accounts = selectDeviceAccounts(state).filter(
        account => account.symbol === symbol && account.visible,
    );

    return accounts.map(account => account.key);
};

export const selectDeviceNetworksWithAssets = createMemoizedSelector(
    [selectVisibleDeviceAccounts],
    accounts => {
        return pipe(
            accounts,
            A.map(account => account.symbol),
            A.uniq,
            A.sort((a, b) => {
                const aOrder = networkSymbolCollection.indexOf(a) ?? Number.MAX_SAFE_INTEGER;
                const bOrder = networkSymbolCollection.indexOf(b) ?? Number.MAX_SAFE_INTEGER;

                return aOrder - bOrder;
            }),
        );
    },
);

export const selectBottomSheetDeviceNetworkItems = createMemoizedSelector(
    [
        selectVisibleDeviceAccountsByNetworkSymbol,
        selectTokenDefinitions,
        (_state, symbol: NetworkSymbol) => symbol,
    ],
    (accounts, tokenDefinitions, symbol) =>
        pipe(
            accounts,
            sortAccountsByNetworksAndAccountTypes,
            A.map(account =>
                getAccountListSections(
                    account,
                    getSimpleCoinDefinitionsByNetwork(tokenDefinitions, symbol),
                ),
            ),
            A.flat,
            F.toMutable,
        ),
);

const selectDeviceAssetsWithBalances = createMemoizedSelector(
    [
        selectVisibleDeviceAccounts,
        selectDeviceNetworksWithAssets,
        selectFiatCurrencyCode,
        selectCurrentFiatRates,
    ],
    (accounts, deviceNetworksWithAssets, fiatCurrencyCode, rates) => {
        const accountsWithFiatBalance = accounts.map(account => {
            const fiatValue = getAccountFiatBalance({
                account,
                localCurrency: fiatCurrencyCode,
                rates,
            });

            return {
                symbol: account.symbol,
                fiatValue,
                cryptoValue: getAccountCryptoBalanceWithStaking(account),
            };
        });

        let totalFiatBalance = 0;

        const assets = deviceNetworksWithAssets.map((symbol: NetworkSymbol) => {
            const networkAccounts = accountsWithFiatBalance.filter(
                account => account.symbol === symbol,
            );
            const assetBalance = networkAccounts.reduce(
                (sum, { cryptoValue }) => sum + Number(cryptoValue),
                0,
            );
            const fiatBalance = networkAccounts.reduce(
                (sum, { fiatValue }) => (fiatValue ? Number(fiatValue) + (sum ?? 0) : sum),
                null as number | null,
            );

            totalFiatBalance += fiatBalance ?? 0;

            const asset: AssetType = {
                symbol,
                // For assets we should always only 8 decimals to save space
                assetBalance: assetBalance.toFixed(8),
                fiatBalance: fiatBalance !== null ? fiatBalance.toFixed(2) : null,
            };

            return asset;
        });

        return { assets, totalFiatBalance: totalFiatBalance.toFixed(2) };
    },
);

export const selectAssetCryptoValue = (state: AssetsRootState, symbol: NetworkSymbol) => {
    const assets = selectDeviceAssetsWithBalances(state);
    const asset = assets.assets.find(a => a.symbol === symbol);

    return asset?.assetBalance ?? '0';
};

export const selectAssetFiatValue = createMemoizedSelector(
    [selectDeviceAssetsWithBalances, (_state, symbol: NetworkSymbol) => symbol],
    (assets, symbol) => {
        const asset = assets.assets.find(a => a.symbol === symbol);

        return asset?.fiatBalance ?? null;
    },
);

const selectAssetsFiatValuePercentage = createMemoizedSelector(
    [selectDeviceAssetsWithBalances],
    assets => {
        const percentages = calculateAssetsPercentage(assets.assets);

        return percentages;
    },
);

export const selectAssetFiatValuePercentage = createMemoizedSelector(
    [selectAssetsFiatValuePercentage, (_state, symbol: NetworkSymbol) => symbol],
    (assetsPercentages, symbol) => {
        const asset = assetsPercentages.find(a => a.symbol === symbol);

        const assetPercentage = {
            fiatPercentage: Math.ceil(asset?.fiatPercentage ?? 0),
            fiatPercentageOffset: Math.floor(asset?.fiatPercentageOffset ?? 0),
        };

        return assetPercentage;
    },
);
