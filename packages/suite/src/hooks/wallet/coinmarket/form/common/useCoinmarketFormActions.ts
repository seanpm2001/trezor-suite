import { useCallback, useEffect, useRef, useState } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { useDebounce } from 'react-use';

import { FiatCurrencyCode } from 'invity-api';

import { isChanged } from '@suite-common/suite-utils';
import { selectAccounts, selectDevice } from '@suite-common/wallet-core';
import {
    amountToSmallestUnit,
    formatAmount,
    fromFiatCurrency,
    isZero,
} from '@suite-common/wallet-utils';
import { BigNumber } from '@trezor/utils';

import {
    FORM_CRYPTO_TOKEN,
    FORM_OUTPUT_ADDRESS,
    FORM_OUTPUT_AMOUNT,
    FORM_OUTPUT_CURRENCY,
    FORM_OUTPUT_FIAT,
    FORM_OUTPUT_MAX,
    FORM_RECEIVE_CRYPTO_CURRENCY_SELECT,
    FORM_SEND_CRYPTO_CURRENCY_SELECT,
} from 'src/constants/wallet/coinmarket/form';
import { useSelector } from 'src/hooks/suite';
import { useCoinmarketFiatValues } from 'src/hooks/wallet/coinmarket/form/common/useCoinmarketFiatValues';
import { useCoinmarketInfo } from 'src/hooks/wallet/coinmarket/useCoinmarketInfo';
import { useBitcoinAmountUnit } from 'src/hooks/wallet/useBitcoinAmountUnit';
import { CoinmarketAccountOptionsGroupOptionProps } from 'src/types/coinmarket/coinmarket';
import {
    CoinmarketExchangeFormProps,
    CoinmarketSellExchangeFormProps,
    CoinmarketSellFormProps,
    CoinmarketUseFormActionsProps,
    CoinmarketUseFormActionsReturnProps,
} from 'src/types/coinmarket/coinmarketForm';
import {
    coinmarketGetSortedAccounts,
    cryptoIdToNetworkSymbol,
    getCoinmarketNetworkDecimals,
} from 'src/utils/wallet/coinmarket/coinmarketUtils';
import { coinmarketGetExchangeReceiveCryptoId } from 'src/utils/wallet/coinmarket/exchangeUtils';

/**
 * shareable sub-hook used in useCoinmarketSellForm & useCoinmarketExchangeForm
 * managing effects on input changes
 * @return functions and values to handle form inputs and update fee levels
 */
export const useCoinmarketFormActions = <T extends CoinmarketSellExchangeFormProps>({
    account,
    methods,
    isNotFormPage,
    draftUpdated,
    type,
    handleChange,
    setAmountLimits,
    changeFeeLevel,
    composeRequest,
    setAccountOnChange,
    setComposedLevels,
}: CoinmarketUseFormActionsProps<T>): CoinmarketUseFormActionsReturnProps => {
    const { symbol } = account;
    const { shouldSendInSats } = useBitcoinAmountUnit(symbol);
    const accounts = useSelector(selectAccounts);
    const device = useSelector(selectDevice);
    const accountsSorted = coinmarketGetSortedAccounts({
        accounts,
        deviceState: device?.state?.staticSessionId,
    });
    const [isUsedFractionButton, setIsUsedFractionButton] = useState(false);
    const { buildDefaultCryptoOption } = useCoinmarketInfo();

    const { getValues, setValue, clearErrors, handleSubmit, control } =
        methods as unknown as UseFormReturn<CoinmarketSellExchangeFormProps>;
    const { outputs, sendCryptoSelect } = getValues();
    const values = useWatch<CoinmarketSellExchangeFormProps>({ control });
    const previousValues = useRef<typeof values | null>(isNotFormPage ? draftUpdated : null);
    const tokenAddress = outputs?.[0]?.token;
    const tokenData = account.tokens?.find(t => t.contract === tokenAddress);
    const isBalanceZero = tokenData
        ? isZero(tokenData.balance || '0')
        : isZero(account.formattedBalance);
    const coinmarketFiatValues = useCoinmarketFiatValues({
        sendCryptoSelect,
        fiatCurrency: getValues().outputs?.[0]?.currency?.value as FiatCurrencyCode,
    });
    const networkDecimals = getCoinmarketNetworkDecimals({
        sendCryptoSelect,
    });

    // on manual change of crypto amount, set fiat amount
    const onFiatCurrencyChange = async (value: FiatCurrencyCode) => {
        setIsUsedFractionButton(false);

        if (!coinmarketFiatValues) return;

        const rate = await coinmarketFiatValues.fiatRatesUpdater(value);
        const amount = getValues(FORM_OUTPUT_AMOUNT);
        const formattedAmount = new BigNumber(
            shouldSendInSats ? formatAmount(amount, networkDecimals) : amount,
        );

        if (
            rate?.rate &&
            formattedAmount &&
            !formattedAmount.isNaN() &&
            formattedAmount.gt(0) // formatAmount() returns '-1' on error
        ) {
            const fiatValueBigNumber = formattedAmount.multipliedBy(rate.rate);

            setValue(FORM_OUTPUT_FIAT, fiatValueBigNumber.toFixed(2), {
                shouldValidate: true,
            });
        }
    };

    // watch change in fiat amount and recalculate fees on change
    const calculateCryptoAmountFromFiat = useCallback(
        (fiatAmount: string | undefined) => {
            const fiatCurrency = getValues(FORM_OUTPUT_CURRENCY);

            if (!coinmarketFiatValues || !fiatCurrency || !fiatAmount) {
                return;
            }

            const cryptoAmount = fromFiatCurrency(
                fiatAmount,
                networkDecimals,
                coinmarketFiatValues.fiatRate?.rate,
            );

            const formattedCryptoAmount =
                cryptoAmount && shouldSendInSats
                    ? amountToSmallestUnit(cryptoAmount, networkDecimals)
                    : cryptoAmount ?? '';
            setValue(FORM_OUTPUT_AMOUNT, formattedCryptoAmount, { shouldValidate: true });
        },
        [getValues, coinmarketFiatValues, networkDecimals, shouldSendInSats, setValue],
    );

    const setExchangeReceiveCrypto = (selected: CoinmarketAccountOptionsGroupOptionProps) => {
        if (type !== 'exchange') return;

        const valuesTyped = values as CoinmarketExchangeFormProps;

        if (selected.value === valuesTyped?.receiveCryptoSelect?.value) {
            const receiveCryptoSelect = coinmarketGetExchangeReceiveCryptoId(
                selected.value,
                valuesTyped?.receiveCryptoSelect?.value,
            );

            setValue(
                FORM_RECEIVE_CRYPTO_CURRENCY_SELECT,
                buildDefaultCryptoOption(receiveCryptoSelect),
            );
        }
    };

    const onCryptoCurrencyChange = async (selected: CoinmarketAccountOptionsGroupOptionProps) => {
        const networkSymbol = cryptoIdToNetworkSymbol(selected.value);
        const cryptoSelectedCurrent = getValues(FORM_SEND_CRYPTO_CURRENCY_SELECT);
        const isSameCryptoSelected =
            cryptoSelectedCurrent &&
            cryptoSelectedCurrent.descriptor === selected.descriptor &&
            cryptoSelectedCurrent.value === selected.value;
        const account = accountsSorted.find(
            item => item.descriptor === selected.descriptor && item.symbol === networkSymbol,
        );

        if (!account || isSameCryptoSelected) return;

        setValue(FORM_OUTPUT_ADDRESS, '');
        setValue(FORM_OUTPUT_AMOUNT, '');
        setValue(FORM_CRYPTO_TOKEN, selected?.contractAddress ?? null);

        if (account.networkType === 'ethereum') {
            // set token address for ERC20 transaction to estimate the fees more precisely
            setValue(FORM_OUTPUT_ADDRESS, selected?.contractAddress ?? '');
        }
        if (account.networkType === 'solana' && !selected?.contractAddress) {
            setValue(FORM_OUTPUT_ADDRESS, selected?.descriptor ?? '');
        }

        setValue(FORM_OUTPUT_MAX, undefined);
        setValue(FORM_OUTPUT_AMOUNT, '');
        setValue(FORM_OUTPUT_FIAT, '');
        setAmountLimits(undefined);
        setComposedLevels(undefined);

        await coinmarketFiatValues?.fiatRatesUpdater(
            getValues(FORM_OUTPUT_CURRENCY)?.value as FiatCurrencyCode,
        );

        setAccountOnChange(account);
        setExchangeReceiveCrypto(selected);

        changeFeeLevel('normal'); // reset fee level
    };

    const setRatioAmount = (divisor: number) => {
        const amount = tokenData
            ? new BigNumber(tokenData.balance || '0')
                  .dividedBy(divisor)
                  .decimalPlaces(tokenData.decimals)
                  .toString()
            : new BigNumber(account.formattedBalance)
                  .dividedBy(divisor)
                  .decimalPlaces(networkDecimals)
                  .toString();
        const cryptoInputValue = shouldSendInSats
            ? amountToSmallestUnit(amount, networkDecimals)
            : amount;
        clearErrors([FORM_OUTPUT_FIAT, FORM_OUTPUT_AMOUNT]);
        setValue(FORM_OUTPUT_AMOUNT, cryptoInputValue, { shouldDirty: true });
        setValue(FORM_OUTPUT_MAX, undefined, { shouldDirty: true });
        setIsUsedFractionButton(true);
    };

    const setAllAmount = () => {
        setValue(FORM_OUTPUT_MAX, 0, { shouldDirty: true });
        setValue(FORM_OUTPUT_FIAT, '', { shouldDirty: true });
        setValue(FORM_OUTPUT_AMOUNT, '', { shouldDirty: true });
        clearErrors([FORM_OUTPUT_FIAT, FORM_OUTPUT_AMOUNT]);

        setIsUsedFractionButton(true);
        composeRequest(FORM_OUTPUT_AMOUNT);
    };

    // call change handler on every change of text inputs with debounce
    useDebounce(
        () => {
            const fiatValue = values?.outputs?.[0]?.fiat;
            const cryptoValue = values?.outputs?.[0]?.amount;
            const fiatChanged = isChanged(previousValues.current?.outputs?.[0].fiat, fiatValue);
            const cryptoChanged = isChanged(
                previousValues.current?.outputs?.[0].amount,
                cryptoValue,
            );

            // this will also update crypto amount
            // controlling setMaxOutputId prevents from double request
            if (fiatChanged && !isUsedFractionButton) {
                calculateCryptoAmountFromFiat(fiatValue);
            }

            // calculateCryptoAmountFromFiat will update crypto amount - avoiding double request
            if (cryptoChanged) {
                handleSubmit(() => {
                    handleChange();
                })();
                setIsUsedFractionButton(false);

                previousValues.current = values;
            }
        },
        500,
        [previousValues, handleChange, handleSubmit],
    );

    // call change handler on every change of select inputs
    // effect only for sell form
    useEffect(() => {
        if (type !== 'sell') return;

        if (
            isChanged(
                (previousValues.current as CoinmarketSellFormProps | null)?.countrySelect,
                (values as CoinmarketSellFormProps).countrySelect,
            ) ||
            isChanged(
                previousValues.current?.outputs?.[0]?.currency?.value,
                values.outputs?.[0]?.currency?.value,
            )
        ) {
            handleSubmit(() => {
                handleChange();
            })();

            previousValues.current = values;
        }
    }, [previousValues, values, handleChange, handleSubmit, isNotFormPage, type]);

    // call change handler on every change of select inputs
    // effect only for exchange form
    useEffect(() => {
        if (type !== 'exchange') return;

        if (
            isChanged(
                (previousValues.current as CoinmarketExchangeFormProps)?.receiveCryptoSelect?.value,
                (values as CoinmarketExchangeFormProps)?.receiveCryptoSelect?.value,
            )
        ) {
            handleSubmit(() => {
                handleChange();
            })();

            previousValues.current = values;
        }
    }, [previousValues, values, handleChange, handleSubmit, isNotFormPage, type]);

    return {
        isBalanceZero,

        onFiatCurrencyChange,
        onCryptoCurrencyChange,
        setRatioAmount,
        setAllAmount,
    };
};
