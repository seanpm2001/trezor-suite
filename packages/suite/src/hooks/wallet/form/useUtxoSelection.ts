import { useEffect, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';

import {
    ExcludedUtxos,
    FormState,
    UtxoSorting,
    WalletAccountTransaction,
} from '@suite-common/wallet-types';
import type { AccountUtxo, PROTO } from '@trezor/connect';
import { getUtxoOutpoint, isSameUtxo } from '@suite-common/wallet-utils';
import { BigNumber } from '@trezor/utils';
import { selectAccountTransactionsWithNulls } from '@suite-common/wallet-core';

import { useSelector } from 'src/hooks/suite';

import { useCoinjoinRegisteredUtxos } from './useCoinjoinRegisteredUtxos';
import {
    SendContextValues,
    UseSendFormState,
    UtxoSelectionContext,
} from '../../../types/wallet/sendForm';

interface UtxoSelectionContextProps
    extends UseFormReturn<FormState>,
        Pick<UseSendFormState, 'account' | 'composedLevels'> {
    excludedUtxos: ExcludedUtxos;
    composeRequest: SendContextValues['composeTransaction'];
}

type UtxoSortingFunction = (context: {
    accountTransactions: WalletAccountTransaction[];
}) => (a: AccountUtxo, b: AccountUtxo) => number;

const sortFromLargestToSmallest: UtxoSortingFunction = () => (a: AccountUtxo, b: AccountUtxo) =>
    new BigNumber(b.amount).comparedTo(new BigNumber(a.amount));

const sortFromNewestToOldest: UtxoSortingFunction =
    ({ accountTransactions }) =>
    (a: AccountUtxo, b: AccountUtxo) => {
        if (a.blockHeight > 0 && b.blockHeight > 0) {
            return b.blockHeight - a.blockHeight;
        }

        // Pending transactions do not have blockHeight, so we must use blockTime of the transaction instead.
        const getBlockTime = (txid: string) => {
            const transaction = accountTransactions.find(transaction => transaction.txid === txid);

            return transaction?.blockTime ?? 0;
        };

        return new BigNumber(getBlockTime(b.txid)).comparedTo(new BigNumber(getBlockTime(a.txid)));
    };

const utxoSortMap: Record<UtxoSorting, UtxoSortingFunction> = {
    largestFirst: sortFromLargestToSmallest,
    smallestFirst:
        context =>
        (...params) =>
            sortFromLargestToSmallest(context)(...params) * -1,

    newestFirst: sortFromNewestToOldest,
    oldestFirst:
        context =>
        (...params) =>
            sortFromNewestToOldest(context)(...params) * -1,
};

const sortUtxos = (
    utxos: AccountUtxo[],
    utxoSorting: UtxoSorting | undefined,
    accountTransactions: WalletAccountTransaction[],
): AccountUtxo[] => {
    if (utxoSorting === undefined) {
        return utxos;
    }

    return [...utxos].sort(utxoSortMap[utxoSorting]({ accountTransactions }));
};

export const useUtxoSelection = ({
    account,
    composedLevels,
    composeRequest,
    excludedUtxos,
    register,
    setValue,
    watch,
}: UtxoSelectionContextProps): UtxoSelectionContext => {
    const accountTransactions = useSelector(state =>
        selectAccountTransactionsWithNulls(state, account.key),
    );

    // register custom form field (without HTMLElement)
    useEffect(() => {
        register('isCoinControlEnabled');
        register('selectedUtxos');
        register('anonymityWarningChecked');
        register('utxoSorting');
    }, [register]);

    const coinjoinRegisteredUtxos = useCoinjoinRegisteredUtxos({ account });

    const [isCoinControlEnabled, options, selectedFee, utxoSorting] = watch([
        'isCoinControlEnabled',
        'options',
        'selectedFee',
        'utxoSorting',
    ]);
    // confirmation of spending low-anonymity UTXOs - only relevant for coinjoin account
    const anonymityWarningChecked = !!watch('anonymityWarningChecked');
    // manually selected UTXOs
    const selectedUtxos = watch('selectedUtxos', []);

    // watch changes of account utxos AND utxos registered in coinjoin Round,
    // exclude spent/registered utxos from the subset of selectedUtxos
    useEffect(() => {
        if (isCoinControlEnabled && selectedUtxos.length > 0) {
            const spentUtxos = selectedUtxos.filter(
                selected => !account.utxo?.some(utxo => isSameUtxo(selected, utxo)),
            );
            const registeredUtxos = selectedUtxos.filter(selected =>
                coinjoinRegisteredUtxos.some(utxo => isSameUtxo(selected, utxo)),
            );

            if (spentUtxos.length > 0 || registeredUtxos.length > 0) {
                setValue(
                    'selectedUtxos',
                    selectedUtxos.filter(
                        u => !spentUtxos.includes(u) && !registeredUtxos.includes(u),
                    ),
                );
                composeRequest();
            }
        }
    }, [
        isCoinControlEnabled,
        selectedUtxos,
        account.utxo,
        coinjoinRegisteredUtxos,
        setValue,
        composeRequest,
    ]);

    const spendableUtxos: AccountUtxo[] = [];
    const lowAnonymityUtxos: AccountUtxo[] = [];
    const dustUtxos: AccountUtxo[] = [];

    // Skip sorting and categorizing UTXOs if coin control is not enabled.
    const utxos =
        options?.includes('utxoSelection') && account?.utxo
            ? sortUtxos(account?.utxo, utxoSorting, accountTransactions)
            : account?.utxo;

    if (utxos?.length) {
        utxos?.forEach(utxo => {
            switch (excludedUtxos[getUtxoOutpoint(utxo)]) {
                case 'low-anonymity':
                    lowAnonymityUtxos.push(utxo);

                    return;
                case 'dust':
                    dustUtxos.push(utxo);

                    return;
                default:
                    spendableUtxos.push(utxo);
            }
        });
    }

    // category displayed on top and controlled by the check-all checkbox
    const topCategory =
        [spendableUtxos, lowAnonymityUtxos, dustUtxos].find(utxoCategory => utxoCategory.length) ||
        [];

    // is there at least one UTXO and are all UTXOs in the top category selected?
    const allUtxosSelected =
        !!topCategory.length &&
        !!topCategory?.every((utxo: AccountUtxo) =>
            selectedUtxos.some(selected => isSameUtxo(selected, utxo)),
        );

    // transaction composed for the fee level chosen by the user
    const composedLevel = composedLevels?.[selectedFee || 'normal'];

    // inputs to be used in the transactions
    const composedInputs = useMemo(
        () => (composedLevel && 'inputs' in composedLevel ? composedLevel.inputs : []),
        [composedLevel],
    ) as PROTO.TxInputType[];

    // UTXOs corresponding to the inputs
    // it is a different object type, but some properties are shared between the two
    const preselectedUtxos = useMemo(
        () =>
            account.utxo?.filter(utxo =>
                composedInputs.some(
                    input => input.prev_hash === utxo.txid && input.prev_index === utxo.vout,
                ),
            ) || [],
        [account.utxo, composedInputs],
    );

    // at least one of the selected UTXOs does not comply to target anonymity
    const isLowAnonymityUtxoSelected =
        account.accountType === 'coinjoin' &&
        selectedUtxos.some(
            selectedUtxo => excludedUtxos[getUtxoOutpoint(selectedUtxo)] === 'low-anonymity',
        );

    // uncheck the confirmation checkbox whenever it is hidden
    if (!isLowAnonymityUtxoSelected && anonymityWarningChecked) {
        setValue('anonymityWarningChecked', false);
    }

    const selectUtxoSorting = (sorting: UtxoSorting) => setValue('utxoSorting', sorting);

    const toggleAnonymityWarning = () =>
        setValue('anonymityWarningChecked', !anonymityWarningChecked);

    // uncheck all UTXOs or check all spendable UTXOs and enable coin control
    const toggleCheckAllUtxos = () => {
        if (allUtxosSelected) {
            setValue('selectedUtxos', []);
        } else {
            // check top category and keep any already checked UTXOs from other categories
            const selectedUtxosFromLowerCategories = selectedUtxos.filter(
                selected => !topCategory?.find(utxo => isSameUtxo(selected, utxo)),
            );
            setValue(
                'selectedUtxos',
                topCategory
                    .concat(selectedUtxosFromLowerCategories)
                    .filter(utxo => !coinjoinRegisteredUtxos.includes(utxo)),
            );
            setValue('isCoinControlEnabled', true);
        }
        composeRequest();
    };

    // enable coin control or disable it and reset selected UTXOs
    const toggleCoinControl = () => {
        setValue('isCoinControlEnabled', !isCoinControlEnabled);
        setValue('selectedUtxos', isCoinControlEnabled ? [] : preselectedUtxos);
        composeRequest();
    };

    // uncheck a UTXO or check it and enable coin control
    const toggleUtxoSelection = (utxo: AccountUtxo) => {
        const alreadySelectedUtxo = selectedUtxos.find(selected => isSameUtxo(selected, utxo));
        if (alreadySelectedUtxo) {
            // uncheck the UTXO if already selected
            setValue(
                'selectedUtxos',
                selectedUtxos.filter(u => u !== alreadySelectedUtxo),
            );
        } else {
            // check the UTXO
            // however, in case the coin control has not been enabled and the UTXO has been preselected, do not check it
            const selectedUtxosOld = !isCoinControlEnabled ? preselectedUtxos : selectedUtxos;
            const selectedUtxosNew = preselectedUtxos.some(selected => isSameUtxo(selected, utxo))
                ? preselectedUtxos
                : [...selectedUtxosOld, utxo];

            setValue('selectedUtxos', selectedUtxosNew);
            setValue('isCoinControlEnabled', true);
        }
        composeRequest();
    };

    return {
        excludedUtxos,
        allUtxosSelected,
        anonymityWarningChecked,
        composedInputs,
        dustUtxos,
        isCoinControlEnabled,
        isLowAnonymityUtxoSelected,
        lowAnonymityUtxos,
        selectedUtxos,
        spendableUtxos,
        coinjoinRegisteredUtxos,
        utxoSorting,
        selectUtxoSorting,
        toggleAnonymityWarning,
        toggleCheckAllUtxos,
        toggleCoinControl,
        toggleUtxoSelection,
    };
};
