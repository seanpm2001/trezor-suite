import { A, G, pipe } from '@mobily/ts-belt';

import { getWeakRandomId, isArrayMember } from '@trezor/utils';
import { createThunk } from '@suite-common/redux-utils';
import {
    accountsActions,
    DISCOVERY_MODULE_PREFIX,
    selectDeviceDiscovery,
    updateDiscovery,
    createDiscovery,
    removeDiscovery,
    getAvailableCardanoDerivationsThunk,
    selectDeviceAccountByDescriptorAndNetworkSymbol,
    selectDevice,
    LIMIT,
    selectDeviceAccountsForNetworkSymbolAndAccountType,
    disableAccountsThunk,
    selectFirstNormalAccountForNetworkSymbol,
    selectHasDeviceDiscovery,
    filterUnavailableAccountTypes,
    selectDeviceStaticSessionId,
    selectDeviceByStaticSessionId,
} from '@suite-common/wallet-core';
import { selectIsAccountAlreadyDiscovered } from '@suite-native/accounts';
import TrezorConnect, { StaticSessionId } from '@trezor/connect';
import { Account, DiscoveryItem } from '@suite-common/wallet-types';
import {
    getDerivationType,
    substituteBip43Path,
    tryGetAccountIdentity,
} from '@suite-common/wallet-utils';
import {
    AccountType,
    Network,
    NetworkSymbol,
    getNetwork,
    getNetworkType,
    NetworkAccount,
    normalizeNetworkAccounts,
    isNetworkSymbol,
} from '@suite-common/wallet-config';
import { DiscoveryStatus } from '@suite-common/wallet-constants';
import { requestDeviceAccess } from '@suite-native/device-mutex';
import { analytics, EventType } from '@suite-native/analytics';

import {
    selectDiscoveryInfo,
    selectDeviceEnabledDiscoveryNetworkSymbols,
    setDiscoveryInfo,
} from './discoveryConfigSlice';
import {
    selectCanRunDiscoveryForDevice,
    selectDiscoveryAccountsAnalytics,
    selectNetworksWithUnfinishedDiscovery,
    selectShouldRunDiscoveryForDevice,
} from './discoverySelectors';

const DISCOVERY_DEFAULT_BATCH_SIZE = 2;

const DISCOVERY_BATCH_SIZE_PER_COIN: Partial<Record<NetworkSymbol, number>> = {
    bch: 1,
    dash: 1,
    btg: 1,
    dgb: 1,
    nmc: 1,
    vtc: 1,
    zec: 1,
    etc: 1,
};

export const discoveryErrors = {
    accountNotFound: 'discovery-no-account',
    descriptorsNotFound: 'discovery-no-descriptors',
    accountLimitReached: 'discovery-account-limit',
};

const getBatchSizeByCoin = (coin: NetworkSymbol): number => {
    if (coin in DISCOVERY_BATCH_SIZE_PER_COIN) {
        return DISCOVERY_BATCH_SIZE_PER_COIN[coin]!;
    }

    return DISCOVERY_DEFAULT_BATCH_SIZE;
};

type DiscoveryDescriptorItem = DiscoveryItem & { descriptor: string };

const fetchBundleDescriptorsThunk = createThunk<
    DiscoveryDescriptorItem[],
    DiscoveryItem[],
    { rejectValue: string }
>(
    `${DISCOVERY_MODULE_PREFIX}/fetchBundleDescriptorsThunk`,
    async (bundle, { getState, rejectWithValue, fulfillWithValue }) => {
        const device = selectDevice(getState());

        const result = await TrezorConnect.getAccountDescriptor({
            bundle,
            skipFinalReload: true,
            device,
            useEmptyPassphrase: device?.useEmptyPassphrase,
        });

        if (!result.success) {
            return rejectWithValue(result.payload.error);
        }

        if (result.success && result.payload) {
            return fulfillWithValue(
                pipe(
                    result.payload ?? [],
                    A.filter(G.isNotNullable),
                    A.map(bundleItem => bundleItem.descriptor),
                    A.zipWith(bundle, (descriptor, bundleItem) => ({ ...bundleItem, descriptor })),
                ) as DiscoveryDescriptorItem[],
            );
        }

        return rejectWithValue(discoveryErrors.descriptorsNotFound);
    },
);

const finishNetworkTypeDiscoveryThunk = createThunk(
    `${DISCOVERY_MODULE_PREFIX}/finishNetworkTypeDiscoveryThunk`,
    (_, { dispatch, getState }) => {
        const discovery = selectDeviceDiscovery(getState());

        if (!discovery) {
            return;
        }

        const finishedNetworksCount = discovery.loaded + 1;
        dispatch(
            updateDiscovery({
                ...discovery,
                loaded: finishedNetworksCount,
            }),
        );

        if (finishedNetworksCount >= discovery.total) {
            dispatch(removeDiscovery(discovery.deviceState));

            // Id used to group multiple analytic events of a single discovery run together.
            const discoveryId = getWeakRandomId(10);

            const discoveryAccountsAnalytics = selectDiscoveryAccountsAnalytics(
                getState(),
                discovery.deviceState,
            );

            // Keboola analytics data backend is unable to parse nested objects, so each network has to be reported separately.
            Object.entries(discoveryAccountsAnalytics).forEach(
                ([symbol, networkAnalyticsPayload]) => {
                    if (isNetworkSymbol(symbol)) {
                        analytics.report({
                            type: EventType.CoinDiscovery,
                            payload: {
                                discoveryId,
                                symbol,
                                ...networkAnalyticsPayload,
                            },
                        });
                    }
                },
            );

            const discoveryInfo = selectDiscoveryInfo(getState());

            // Discovery analytics duration tracking
            if (discoveryInfo !== null) {
                const endTime = performance.now();
                const duration = endTime - discoveryInfo.startTimestamp;

                analytics.report({
                    type: EventType.DiscoveryDuration,
                    payload: {
                        discoveryId,
                        loadDuration: duration,
                        networkSymbols: discoveryInfo.networkSymbols,
                    },
                });
                dispatch(setDiscoveryInfo(null));
            }
        }
    },
);

const getAccountInfoDetailsLevel = (coin: NetworkSymbol) => {
    const networkType = getNetworkType(coin);
    // For Cardano we need to fetch at least one tx otherwise it will not generate correctly new receive addresses (xpub instead of address)
    if (networkType === 'cardano') return { details: 'txs', pageSize: 1 } as const;

    // CAUTION: the detail level has to be set to "tokenBalances" or higher. In other case we won't get account receive addresses from the backend.
    return { details: 'tokenBalances' } as const;
};

const getCardanoSupportedAccountTypesThunk = createThunk(
    `${DISCOVERY_MODULE_PREFIX}/getCardanoSupportedAccountTypesThunk`,
    async (
        {
            deviceState,
        }: {
            deviceState: StaticSessionId;
        },
        { dispatch, getState },
    ) => {
        const device = selectDeviceByStaticSessionId(getState(), deviceState);
        if (!device) {
            return undefined;
        }
        const availableCardanoDerivationsResponse = await requestDeviceAccess({
            deviceCallback: () =>
                dispatch(
                    getAvailableCardanoDerivationsThunk({
                        deviceState,
                    }),
                ).unwrap(),
        });

        if (availableCardanoDerivationsResponse.success) {
            return availableCardanoDerivationsResponse.payload;
        }
    },
);

export const addAccountByDescriptorThunk = createThunk(
    `${DISCOVERY_MODULE_PREFIX}/addAccountByDescriptorThunk`,
    async (
        {
            deviceState,
            bundleItem,
            identity,
        }: {
            deviceState: StaticSessionId;
            bundleItem: DiscoveryDescriptorItem;
            identity?: string;
        },
        { dispatch, getState },
    ) => {
        const device = selectDevice(getState());
        const { success, payload: accountInfo } = await TrezorConnect.getAccountInfo({
            coin: bundleItem.coin,
            identity,
            device,
            descriptor: bundleItem.descriptor,
            useEmptyPassphrase: device?.useEmptyPassphrase,
            skipFinalReload: true,
            ...getAccountInfoDetailsLevel(bundleItem.coin),
        });

        const accounts = selectDeviceAccountsForNetworkSymbolAndAccountType(
            getState(),
            bundleItem.coin,
            bundleItem.accountType,
        );

        const hasEmptyAccount = accounts.some(account => account.empty);

        if (success) {
            dispatch(
                accountsActions.createIndexLabeledAccount({
                    discoveryItem: bundleItem,
                    deviceState,
                    accountInfo,
                    // In most cases, there should be already empty account, because this thunk is called after
                    // changing visibility of first empty hidden account.
                    // But if there is no empty account (discovery previously failed), we should show this one.
                    // And because of async calls, we check for empty account here and not passing the value from the previous step.
                    visible: !hasEmptyAccount,
                }),
            );

            analytics.report({
                type: EventType.CoinDiscoveryNewAccount,
                payload: {
                    symbol: bundleItem.coin,
                    path: bundleItem.path,
                    type: bundleItem.accountType,
                },
            });
        }
    },
);

const discoverAccountsByDescriptorThunk = createThunk(
    `${DISCOVERY_MODULE_PREFIX}/discoverAccountsByDescriptorThunk`,
    async (
        {
            descriptorsBundle,
            deviceState,
            identity,
        }: {
            descriptorsBundle: DiscoveryDescriptorItem[];
            deviceState: StaticSessionId;
            identity?: string;
        },
        { dispatch, getState },
    ) => {
        let isFinalRound = false;

        if (A.isEmpty(descriptorsBundle)) {
            isFinalRound = true;
        }

        const device = selectDevice(getState());
        for (const bundleItem of descriptorsBundle) {
            const { success, payload: accountInfo } = await TrezorConnect.getAccountInfo({
                coin: bundleItem.coin,
                identity,
                descriptor: bundleItem.descriptor,
                device,
                useEmptyPassphrase: device?.useEmptyPassphrase,
                skipFinalReload: true,
                ...getAccountInfoDetailsLevel(bundleItem.coin),
            });

            const isAccountAlreadyDiscovered = selectIsAccountAlreadyDiscovered(getState(), {
                deviceState,
                networkSymbol: bundleItem.coin,
                path: bundleItem.path,
            });

            if (success && !isAccountAlreadyDiscovered) {
                if (accountInfo.empty) {
                    isFinalRound = true;
                }

                const isVisible =
                    // If the account is not empty, it should be visible.
                    !accountInfo.empty ||
                    // first normal account should be visible every time
                    (bundleItem.accountType === 'normal' && bundleItem.index === 0);

                dispatch(
                    accountsActions.createIndexLabeledAccount({
                        discoveryItem: bundleItem,
                        deviceState,
                        accountInfo,
                        visible: isVisible,
                    }),
                );
            }
        }

        return isFinalRound;
    },
);

export const addAndDiscoverNetworkAccountThunk = createThunk<
    Account,
    {
        accountType: AccountType;
        network: Network;
        deviceState: StaticSessionId;
    },
    { rejectValue: string }
>(
    `${DISCOVERY_MODULE_PREFIX}/addAndDiscoverNetworkAccountThunk`,
    async (
        { accountType, network, deviceState },
        { dispatch, getState, rejectWithValue, fulfillWithValue },
    ) => {
        const accounts = selectDeviceAccountsForNetworkSymbolAndAccountType(
            getState(),
            network.symbol,
            accountType,
        );

        const index = accounts.length;

        if (index > LIMIT) {
            return rejectWithValue(discoveryErrors.accountLimitReached);
        }

        const accountPath = substituteBip43Path(network.bip43Path, index);

        // Take exclusive access to the device and hold it until fetching of the descriptors is done.
        const deviceAccessResponse = await requestDeviceAccess({
            deviceCallback: async () =>
                await dispatch(
                    fetchBundleDescriptorsThunk([
                        {
                            path: accountPath,
                            coin: network.symbol,
                            index,
                            accountType,
                            networkType: network.networkType,
                            derivationType: getDerivationType(accountType),
                            suppressBackupWarning: true,
                            skipFinalReload: true,
                        },
                    ]),
                ).unwrap(),
        });

        if (!deviceAccessResponse.success) {
            return rejectWithValue(deviceAccessResponse.error);
        }

        if (deviceAccessResponse.payload.length < 1) {
            return rejectWithValue(discoveryErrors.accountNotFound);
        }

        const descriptor = deviceAccessResponse.payload[0];
        const identity = tryGetAccountIdentity({
            deviceState,
            networkType: network.networkType,
        });

        await dispatch(
            addAccountByDescriptorThunk({
                bundleItem: descriptor,
                deviceState,
                identity,
            }),
        ).unwrap();

        const account = selectDeviceAccountByDescriptorAndNetworkSymbol(
            getState(),
            descriptor.descriptor,
            network.symbol,
        );

        if (!account) {
            return rejectWithValue(discoveryErrors.accountNotFound);
        }

        return fulfillWithValue(account);
    },
);

const discoverNetworkBatchThunk = createThunk(
    `${DISCOVERY_MODULE_PREFIX}/discoverNetworkBatchThunk`,
    async (
        {
            deviceState,
            round = 1,
            network,
            accountType,
        }: {
            deviceState: StaticSessionId;
            round?: number;
            network: Network;
            accountType: AccountType;
        },
        { dispatch, getState },
    ) => {
        const discovery = selectDeviceDiscovery(getState());
        const batchSize = getBatchSizeByCoin(network.symbol);
        // expected to be found, because this thunk is called with accountType taken from the network
        const normalizedNetworkAccount = normalizeNetworkAccounts(network).find(
            a => a.accountType === accountType,
        );

        if (!discovery || !deviceState || !normalizedNetworkAccount) {
            return;
        }

        const lastDiscoveredAccountIndex = (round - 1) * batchSize;

        const chunkBundle: Array<DiscoveryItem> = [];

        A.makeWithIndex(batchSize, batchIndex => {
            const isEvmLedgerDerivationPath =
                network.networkType === 'ethereum' && accountType === 'ledger';
            // first Ledger derivation path for EVM networks is the same as trezor, so we need to skip it (consistent with desktop)
            const index =
                lastDiscoveredAccountIndex + batchIndex + (isEvmLedgerDerivationPath ? 1 : 0);

            const { bip43Path } = normalizedNetworkAccount;
            const accountPath = substituteBip43Path(bip43Path, index);

            const isAccountAlreadyDiscovered = selectIsAccountAlreadyDiscovered(getState(), {
                deviceState,
                networkSymbol: network.symbol,
                path: accountPath,
            });

            if (!isAccountAlreadyDiscovered) {
                chunkBundle.push({
                    path: accountPath,
                    coin: network.symbol,
                    index,
                    accountType,
                    networkType: network.networkType,
                    derivationType: getDerivationType(accountType),
                    suppressBackupWarning: true,
                    skipFinalReload: true,
                });
            }
        });

        // All accounts of the batch were already discovered, skip it.
        if (A.isEmpty(chunkBundle)) {
            dispatch(
                discoverNetworkBatchThunk({
                    deviceState,
                    network,
                    accountType,
                    round: round + 1,
                }),
            );

            return;
        }

        // Take exclusive access to the device and hold it until is the fetching of the descriptors done.
        const deviceAccessResponse = await requestDeviceAccess({
            deviceCallback: () => dispatch(fetchBundleDescriptorsThunk(chunkBundle)).unwrap(),
        });

        if (!deviceAccessResponse.success) {
            return;
        }

        const identity = tryGetAccountIdentity({
            deviceState,
            networkType: network.networkType,
        });

        const isFinished = await dispatch(
            discoverAccountsByDescriptorThunk({
                descriptorsBundle: deviceAccessResponse.payload,
                deviceState,
                identity,
            }),
        ).unwrap();

        if (!isFinished) {
            dispatch(
                discoverNetworkBatchThunk({
                    deviceState,
                    network,
                    accountType,
                    round: round + 1,
                }),
            );
        } else {
            dispatch(finishNetworkTypeDiscoveryThunk());
        }
    },
);

export const createDescriptorPreloadedDiscoveryThunk = createThunk(
    `${DISCOVERY_MODULE_PREFIX}/createDescriptorPreloadedDiscoveryThunk`,
    (
        {
            deviceState,
            networks,
            availableCardanoDerivations,
        }: {
            deviceState: StaticSessionId;
            networks: readonly Network[];
            availableCardanoDerivations: ('normal' | 'legacy' | 'ledger')[] | undefined;
        },
        { dispatch, getState },
    ) => {
        const device = selectDeviceByStaticSessionId(getState(), deviceState);

        if (!device) {
            return;
        }

        const hasDiscovery = selectHasDeviceDiscovery(getState());
        if (hasDiscovery) {
            console.warn(
                `Warning discovery for device ${deviceState} already exists. Skipping discovery.`,
            );

            return;
        }

        const discoveryNetworksTotalCount = networks.reduce((count, network) => {
            const availableAccountTypes = filterUnavailableAccountTypes(network, device).filter(
                ({ accountType }) =>
                    // Some cardano derivation may not be supported by the device. We need to exclude them from total count.
                    network.networkType !== 'cardano' ||
                    (availableCardanoDerivations !== undefined &&
                        isArrayMember(accountType, availableCardanoDerivations)),
            );

            return count + availableAccountTypes.length;
        }, 0);

        if (discoveryNetworksTotalCount < 1) {
            return;
        }

        const networksSymbols = networks.map(network => network.symbol);

        dispatch(
            createDiscovery({
                deviceState,
                authConfirm: false,
                index: 0,
                status: DiscoveryStatus.RUNNING,
                total: discoveryNetworksTotalCount,
                bundleSize: 0,
                loaded: 0,
                failed: [],
                availableCardanoDerivations,
                networks: networksSymbols,
            }),
        );
    },
);

// runs only for networks with unfinished discovery based on current accounts
export const startDescriptorPreloadedDiscoveryThunk = createThunk(
    `${DISCOVERY_MODULE_PREFIX}/startDescriptorPreloadedDiscoveryThunk`,
    async (
        {
            forcedAreTestnetsEnabled,
            forcedDeviceState, // device state can be pushed from outside (e.g. in middleware when fetched from action)
        }: { forcedAreTestnetsEnabled?: boolean; forcedDeviceState?: StaticSessionId },
        { dispatch, getState },
    ) => {
        const deviceState = forcedDeviceState ?? selectDeviceStaticSessionId(getState());

        if (!deviceState) {
            console.warn(
                `Warning: deviceState has not been provided nor found. Skipping discovery.`,
            );

            return;
        }

        const device = selectDeviceByStaticSessionId(getState(), deviceState);

        const hasDiscovery1 = selectHasDeviceDiscovery(getState());
        if (hasDiscovery1) {
            console.warn(
                `Warning: discovery for device ${deviceState} already exists. Skipping discovery.`,
            );

            return;
        }

        if (!device) {
            console.warn(`Warning: no device found. Skipping discovery.`);

            return;
        }

        const enabledNetworks = selectDeviceEnabledDiscoveryNetworkSymbols(getState());

        let availableCardanoDerivations: ('normal' | 'legacy' | 'ledger')[] = [];
        if (
            enabledNetworks.some(
                networkSymbol => getNetwork(networkSymbol).networkType === 'cardano',
            )
        ) {
            availableCardanoDerivations =
                (await dispatch(
                    getCardanoSupportedAccountTypesThunk({
                        deviceState,
                    }),
                ).unwrap()) ?? [];
        }

        const networksWithUnfinishedDiscovery = selectNetworksWithUnfinishedDiscovery(
            getState(),
            forcedAreTestnetsEnabled,
            availableCardanoDerivations,
        );

        // Start tracking duration and networks for analytics purposes
        dispatch(
            setDiscoveryInfo({
                startTimestamp: performance.now(),
                networkSymbols: networksWithUnfinishedDiscovery.map(n => n.symbol),
            }),
        );

        // Some cardano derivation are not supported by the device. We need to filter them out.

        // filter out cardano-type networks, if none of their derivations are available
        const networksFiltered = networksWithUnfinishedDiscovery.filter(
            network =>
                network.networkType !== 'cardano' ||
                normalizeNetworkAccounts(network).some(({ accountType }) =>
                    isArrayMember(accountType, availableCardanoDerivations),
                ),
        );

        await dispatch(
            createDescriptorPreloadedDiscoveryThunk({
                deviceState,
                networks: networksFiltered,
                availableCardanoDerivations,
            }),
        );

        // We need to check again here because it's possible that things changed in the meantime because async thunks
        const hasDiscovery2 = selectHasDeviceDiscovery(getState());
        if (!hasDiscovery2) {
            return;
        }

        // Start discovery for every network - normal accounts as well as alternative accounts
        networksFiltered.forEach(network => {
            filterUnavailableAccountTypes(network)
                // with Cardano, we only get here if there are at least some accountTypes available, so discover those ones.
                .filter(
                    ({ accountType }: NetworkAccount) =>
                        network.networkType !== 'cardano' ||
                        isArrayMember(accountType, availableCardanoDerivations),
                )
                .forEach(({ accountType }: NetworkAccount) => {
                    dispatch(discoverNetworkBatchThunk({ deviceState, network, accountType }));
                });
        });
    },
);

// idempotent - can be run any time and checks if it SHOULD and CAN run discovery
// then startDescriptorPreloadedDiscoveryThunk runs discovery only for relevant networks
export const discoveryCheckThunk = createThunk(
    `${DISCOVERY_MODULE_PREFIX}/discoveryCheckThunk`,
    async (
        _,
        { dispatch, getState },
        // eslint-disable-next-line require-await
    ) => {
        // check whether we consider some network not to be fully discovered
        const shouldRunDiscoveryForDevice = selectShouldRunDiscoveryForDevice(getState());

        // check whether we are allowed to run the discovery now
        const canRunDiscoveryForDevice = selectCanRunDiscoveryForDevice(getState());

        if (canRunDiscoveryForDevice && shouldRunDiscoveryForDevice) {
            dispatch(startDescriptorPreloadedDiscoveryThunk({}));
        }
    },
);

// Called when there are changes in enabled/disabled networks
// It removes accounts for disabled networks and checks whether to start discovery and start if needed
export const applyDiscoveryChangesThunk = createThunk(
    `${DISCOVERY_MODULE_PREFIX}/applyDiscoveryChangesThunk`,
    (_, { dispatch, getState }) => {
        // Make sure that first normal account is visible for enabled networks
        // This might be needed in case user has View only device from before coin enabling was active
        // in such case the first normal account can be invisible. We need to make it visible.
        const enabledDiscoveryNetworkSymbols =
            selectDeviceEnabledDiscoveryNetworkSymbols(getState());
        enabledDiscoveryNetworkSymbols.forEach(networkSymbol => {
            const firstNormalAccount = selectFirstNormalAccountForNetworkSymbol(
                getState(),
                networkSymbol,
            );

            if (firstNormalAccount && !firstNormalAccount.visible) {
                dispatch(accountsActions.changeAccountVisibility(firstNormalAccount, true));
            }
        });

        dispatch(disableAccountsThunk());
        dispatch(discoveryCheckThunk());
    },
);
