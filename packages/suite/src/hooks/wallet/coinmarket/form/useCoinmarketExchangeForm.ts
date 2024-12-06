import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import type {
    CryptoId,
    ExchangeTrade,
    ExchangeTradeQuoteRequest,
    FiatCurrencyCode,
} from 'invity-api';
import useDebounce from 'react-use/lib/useDebounce';

import { amountToSmallestUnit, formatAmount, toFiatCurrency } from '@suite-common/wallet-utils';
import { isChanged } from '@suite-common/suite-utils';
import { Account } from '@suite-common/wallet-types';
import { notificationsActions } from '@suite-common/toast-notifications';
import { networks } from '@suite-common/wallet-config';
import { analytics, EventType } from '@trezor/suite-analytics';

import { useDispatch, useSelector } from 'src/hooks/suite';
import invityAPI from 'src/services/suite/invityAPI';
import { saveQuoteRequest, saveQuotes } from 'src/actions/wallet/coinmarketExchangeActions';
import {
    addIdsToQuotes,
    coinmarketGetSuccessQuotes,
    getCoinmarketNetworkDecimals,
    getUnusedAddressFromAccount,
} from 'src/utils/wallet/coinmarket/coinmarketUtils';
import {
    coinmarketGetExchangeReceiveCryptoId,
    createQuoteLink,
    getAmountLimits,
    getCexQuotesByRateType,
    getSuccessQuotesOrdered,
} from 'src/utils/wallet/coinmarket/exchangeUtils';
import { useFormDraft } from 'src/hooks/wallet/useFormDraft';
import { useCoinmarketNavigation } from 'src/hooks/wallet/useCoinmarketNavigation';
import { useBitcoinAmountUnit } from 'src/hooks/wallet/useBitcoinAmountUnit';
import { TradeExchange } from 'src/types/wallet/coinmarketCommonTypes';
import {
    CoinmarketTradeExchangeType,
    UseCoinmarketFormProps,
} from 'src/types/coinmarket/coinmarket';
import {
    CoinmarketExchangeFormContextProps,
    CoinmarketExchangeFormProps,
    CoinmarketExchangeStepType,
} from 'src/types/coinmarket/coinmarketForm';
import {
    FORM_EXCHANGE_CEX,
    FORM_EXCHANGE_DEX,
    FORM_OUTPUT_AMOUNT,
    FORM_OUTPUT_FIAT,
    FORM_EXCHANGE_TYPE,
} from 'src/constants/wallet/coinmarket/form';
import { useCoinmarketExchangeFormDefaultValues } from 'src/hooks/wallet/coinmarket/form/useCoinmarketExchangeFormDefaultValues';
import * as coinmarketExchangeActions from 'src/actions/wallet/coinmarketExchangeActions';
import * as coinmarketCommonActions from 'src/actions/wallet/coinmarket/coinmarketCommonActions';
import { useCoinmarketRecomposeAndSign } from 'src/hooks/wallet/useCoinmarketRecomposeAndSign';
import { useCoinmarketLoadData } from 'src/hooks/wallet/coinmarket/useCoinmarketLoadData';
import { useCoinmarketComposeTransaction } from 'src/hooks/wallet/coinmarket/form/common/useCoinmarketComposeTransaction';
import { useCoinmarketFormActions } from 'src/hooks/wallet/coinmarket/form/common/useCoinmarketFormActions';
import { useCoinmarketCurrencySwitcher } from 'src/hooks/wallet/coinmarket/form/common/useCoinmarketCurrencySwitcher';
import { useCoinmarketModalCrypto } from 'src/hooks/wallet/coinmarket/form/common/useCoinmarketModalCrypto';
import { useCoinmarketAccount } from 'src/hooks/wallet/coinmarket/form/common/useCoinmarketAccount';
import { useCoinmarketInfo } from 'src/hooks/wallet/coinmarket/useCoinmarketInfo';
import { useCoinmarketFiatValues } from 'src/hooks/wallet/coinmarket/form/common/useCoinmarketFiatValues';
import type { CryptoAmountLimitProps } from 'src/utils/suite/validation';

import { useCoinmarketInitializer } from './common/useCoinmarketInitializer';

export const useCoinmarketExchangeForm = ({
    selectedAccount,
    pageType = 'form',
}: UseCoinmarketFormProps): CoinmarketExchangeFormContextProps => {
    const type = 'exchange';
    const isNotFormPage = pageType !== 'form';
    const {
        exchangeInfo,
        quotesRequest,
        isFromRedirect,
        quotes,
        transactionId,
        coinmarketAccount,
        selectedQuote,
        addressVerified,
    } = useSelector(state => state.wallet.coinmarket.exchange);
    const { cryptoIdToCoinSymbol } = useCoinmarketInfo();
    // selectedAccount is used as initial state if this is form page
    // coinmarketAccount is used on offers page
    const [account, setAccount] = useCoinmarketAccount({
        coinmarketAccount,
        selectedAccount,
        isNotFormPage,
    });
    const { callInProgress, timer, device, setCallInProgress, checkQuotesTimer } =
        useCoinmarketInitializer({ selectedAccount, type });
    const { buildDefaultCryptoOption } = useCoinmarketInfo();

    const dispatch = useDispatch();
    const {
        selectedFee: selectedFeeRecomposedAndSigned,
        composed,
        recomposeAndSign,
    } = useCoinmarketRecomposeAndSign();

    const [amountLimits, setAmountLimits] = useState<CryptoAmountLimitProps | undefined>(undefined);

    const [innerQuotes, setInnerQuotes] = useState<ExchangeTrade[] | undefined>(
        coinmarketGetSuccessQuotes<CoinmarketTradeExchangeType>(quotes),
    );
    const [receiveAccount, setReceiveAccount] = useState<Account | undefined>();

    const [isSubmittingHelper, setIsSubmittingHelper] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const [exchangeStep, setExchangeStep] =
        useState<CoinmarketExchangeStepType>('RECEIVING_ADDRESS');
    const {
        navigateToExchangeForm,
        navigateToExchangeDetail,
        navigateToExchangeOffers,
        navigateToExchangeConfirm,
    } = useCoinmarketNavigation(account);

    const { symbol } = account;
    const { shouldSendInSats } = useBitcoinAmountUnit(symbol);
    const network = networks[account.symbol];
    const trades = useSelector(state => state.wallet.coinmarket.trades);
    const trade = trades.find(
        trade =>
            trade.tradeType === 'exchange' && transactionId && trade.data.orderId === transactionId,
    ) as TradeExchange | undefined;

    const { defaultCurrency, defaultValues } = useCoinmarketExchangeFormDefaultValues(account);
    const exchangeDraftKey = 'coinmarket-exchange';
    const { getDraft, saveDraft, removeDraft } =
        useFormDraft<CoinmarketExchangeFormProps>(exchangeDraftKey);
    const draft = getDraft(exchangeDraftKey);
    const isDraft = !!draft;
    const getDraftUpdated = (): CoinmarketExchangeFormProps | null => {
        if (!draft) return null;
        if (isNotFormPage) return draft;

        const defaultReceiveCryptoSelect = coinmarketGetExchangeReceiveCryptoId(
            defaultValues.sendCryptoSelect?.value,
            draft.receiveCryptoSelect?.value,
        );

        return {
            ...defaultValues,
            amountInCrypto: draft.amountInCrypto,
            receiveCryptoSelect: buildDefaultCryptoOption(defaultReceiveCryptoSelect),
            rateType: draft.rateType,
            exchangeType: draft.exchangeType,
        };
    };
    const draftUpdated = getDraftUpdated();
    const methods = useForm({
        mode: 'onChange',
        defaultValues: draftUpdated ?? defaultValues,
    });
    const { reset, register, getValues, setValue, formState, control } = methods;
    const values = useWatch<CoinmarketExchangeFormProps>({ control });
    const { rateType, exchangeType, sendCryptoSelect } = getValues();
    const output = values.outputs?.[0];
    const fiatValues = useCoinmarketFiatValues({
        sendCryptoSelect,
        fiatCurrency: output?.currency?.value as FiatCurrencyCode,
    });
    const fiatOfBestScoredQuote = innerQuotes?.[0]?.sendStringAmount
        ? toFiatCurrency(innerQuotes?.[0]?.sendStringAmount, fiatValues?.fiatRate?.rate, 2)
        : null;

    const formIsValid = Object.keys(formState.errors).length === 0;
    const hasValues = !!output?.amount;
    const isFirstRequest = innerQuotes === undefined;
    const noProviders = exchangeInfo?.exchangeList?.length === 0;
    const isInitialDataLoading = !exchangeInfo?.exchangeList;
    const isFormLoading =
        isInitialDataLoading || formState.isSubmitting || isSubmittingHelper || isFirstRequest;

    const isFormInvalid = !(formIsValid && hasValues);
    const isLoadingOrInvalid = noProviders || isFormLoading || isFormInvalid;

    const filteredCexQuotes = useMemo(
        () => getCexQuotesByRateType(rateType, innerQuotes, exchangeInfo),
        [rateType, innerQuotes, exchangeInfo],
    );
    const dexQuotes = useMemo(() => innerQuotes?.filter(q => q.isDex), [innerQuotes]);
    const decimals = getCoinmarketNetworkDecimals({ sendCryptoSelect, network });

    const {
        isComposing,
        composedLevels,
        feeInfo,
        changeFeeLevel,
        setComposedLevels,
        composeRequest,
    } = useCoinmarketComposeTransaction<CoinmarketExchangeFormProps>({
        account,
        network,
        values: values as CoinmarketExchangeFormProps,
        methods,
    });

    const { toggleAmountInCrypto } = useCoinmarketCurrencySwitcher({
        account,
        methods,
        network,
        quoteCryptoAmount: innerQuotes?.[0]?.sendStringAmount,
        quoteFiatAmount: fiatOfBestScoredQuote ?? '',
        inputNames: {
            cryptoInput: FORM_OUTPUT_AMOUNT,
            fiatInput: FORM_OUTPUT_FIAT,
        },
    });

    const getQuotesRequest = useCallback(async (request: ExchangeTradeQuoteRequest) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();

        const allQuotes = await invityAPI.getExchangeQuotes(
            request,
            abortControllerRef.current.signal,
        );

        return allQuotes;
    }, []);

    const getQuoteRequestData = useCallback((): ExchangeTradeQuoteRequest | null => {
        const { outputs, receiveCryptoSelect, sendCryptoSelect } = getValues();
        const unformattedOutputAmount = outputs[0].amount ?? '';
        const sendStringAmount =
            unformattedOutputAmount && shouldSendInSats
                ? formatAmount(unformattedOutputAmount, decimals)
                : unformattedOutputAmount;

        if (
            !receiveCryptoSelect?.value ||
            !sendCryptoSelect?.value ||
            !sendStringAmount ||
            Number(sendStringAmount) === 0
        ) {
            return null;
        }

        const request: ExchangeTradeQuoteRequest = {
            receive: receiveCryptoSelect.value,
            send: sendCryptoSelect.value,
            sendStringAmount,
            dex: 'enable',
        };

        return request;
    }, [getValues, decimals, shouldSendInSats]);

    const handleChange = useCallback(
        async (offLoading?: boolean) => {
            setIsSubmittingHelper(!offLoading);
            timer.loading();

            const quotesRequest = getQuoteRequestData();

            if (!quotesRequest) {
                setInnerQuotes([]);
                setIsSubmittingHelper(false);
                timer.stop();

                return;
            }

            const allQuotes = await getQuotesRequest(quotesRequest);

            if (Array.isArray(allQuotes)) {
                const currency = cryptoIdToCoinSymbol(quotesRequest.send) ?? quotesRequest.send;
                const limits = getAmountLimits({ quotes: allQuotes, currency });

                const successQuotes = addIdsToQuotes<CoinmarketTradeExchangeType>(
                    getSuccessQuotesOrdered(allQuotes),
                    'exchange',
                );

                setAmountLimits(limits);
                setInnerQuotes(successQuotes);
                dispatch(saveQuotes(successQuotes));
                dispatch(saveQuoteRequest(quotesRequest));

                const { setMaxOutputId } = values;

                // compose transaction only when is not computed from max balance
                // max balance has to be computed before request
                if (setMaxOutputId === undefined && !limits) {
                    composeRequest(FORM_OUTPUT_AMOUNT);
                }
            }

            setIsSubmittingHelper(false);

            timer.reset();
        },
        [
            timer,
            values,
            cryptoIdToCoinSymbol,
            getQuoteRequestData,
            getQuotesRequest,
            dispatch,
            composeRequest,
        ],
    );

    const helpers = useCoinmarketFormActions({
        account,
        methods,
        isNotFormPage,
        draftUpdated,
        type,
        handleChange,
        setAmountLimits,
        changeFeeLevel,
        composeRequest,
        setComposedLevels,
        setAccountOnChange: newAccount => {
            dispatch(coinmarketExchangeActions.setCoinmarketExchangeAccount(newAccount));
            setAccount(newAccount);
        },
    });

    const selectQuote = async (quote: ExchangeTrade) => {
        const provider =
            exchangeInfo?.providerInfos && quote.exchange
                ? exchangeInfo?.providerInfos[quote.exchange]
                : null;
        if (quotesRequest) {
            const result = await dispatch(
                coinmarketExchangeActions.openCoinmarketExchangeConfirmModal(
                    provider?.companyName,
                    quote.isDex,
                    quote.send,
                    quote.receive,
                ),
            );
            if (result) {
                dispatch(coinmarketExchangeActions.saveSelectedQuote(quote));

                navigateToExchangeConfirm();
                timer.stop();
            }
        }
    };

    const confirmTrade = useCallback(
        async (address: string, extraField?: string, trade?: ExchangeTrade) => {
            analytics.report({
                type: EventType.CoinmarketConfirmTrade,
                payload: {
                    type,
                },
            });

            let ok = false;
            const { address: refundAddress } = getUnusedAddressFromAccount(account);
            if (!trade) {
                trade = selectedQuote;
            }
            if (!quotesRequest || !trade || !refundAddress) return false;

            if (trade.isDex && !trade.fromAddress) {
                trade = { ...trade, fromAddress: refundAddress };
            }

            if (!trade.quoteId) {
                return false;
            }

            setCallInProgress(true);
            dispatch(coinmarketExchangeActions.saveTransactionId(undefined));

            const returnUrl = await createQuoteLink(
                quotesRequest,
                account,
                { selectedFee: selectedFeeRecomposedAndSigned, composed },
                trade.quoteId,
            );

            const response = await invityAPI.doExchangeTrade({
                trade,
                receiveAddress: address,
                refundAddress,
                extraField,
                returnUrl,
            });

            if (!response) {
                dispatch(
                    notificationsActions.addToast({
                        type: 'error',
                        error: 'No response from the server',
                    }),
                );
            } else if (
                response.error ||
                !response.status ||
                !response.orderId ||
                response.status === 'ERROR'
            ) {
                dispatch(
                    notificationsActions.addToast({
                        type: 'error',
                        error: response.error || 'Error response from the server',
                    }),
                );
                dispatch(coinmarketExchangeActions.saveSelectedQuote(response));
            } else if (
                response.status === 'APPROVAL_REQ' ||
                response.status === 'APPROVAL_PENDING'
            ) {
                dispatch(coinmarketExchangeActions.saveSelectedQuote(response));
                setExchangeStep('SEND_APPROVAL_TRANSACTION');
                ok = true;
            } else if (response.status === 'CONFIRM') {
                dispatch(coinmarketExchangeActions.saveSelectedQuote(response));
                if (response.isDex) {
                    if (exchangeStep === 'RECEIVING_ADDRESS' || trade.approvalType === 'ZERO') {
                        setExchangeStep('SEND_APPROVAL_TRANSACTION');
                    } else {
                        setExchangeStep('SEND_TRANSACTION');
                    }
                } else {
                    setExchangeStep('SEND_TRANSACTION');
                }
                ok = true;
            } else {
                // CONFIRMING, SUCCESS
                dispatch(
                    coinmarketExchangeActions.saveTrade(
                        response,
                        selectedAccount.account,
                        new Date().toISOString(),
                    ),
                );
                dispatch(coinmarketExchangeActions.saveTransactionId(response.orderId));
                if (response.tradeForm?.form) {
                    dispatch(coinmarketCommonActions.submitRequestForm(response.tradeForm?.form));

                    return true;
                }
                if (response.status === 'LOADING') {
                    setCallInProgress(false);
                    setExchangeStep('SEND_TRANSACTION');

                    return true;
                }
                ok = true;
                navigateToExchangeDetail();
            }
            setCallInProgress(false);

            return ok;
        },
        [
            account,
            selectedQuote,
            exchangeStep,
            selectedAccount.account,
            composed,
            quotesRequest,
            selectedFeeRecomposedAndSigned,
            dispatch,
            setCallInProgress,
            navigateToExchangeDetail,
        ],
    );

    const sendDexTransaction = async () => {
        if (
            selectedQuote &&
            selectedQuote.dexTx &&
            (selectedQuote.status === 'APPROVAL_REQ' || selectedQuote.status === 'CONFIRM')
        ) {
            // after discussion with 1inch, adjust the gas limit by the factor of 1.25
            // swap can use different swap paths when mining tx than when estimating tx
            // the geth gas estimate may be too low
            const result = await recomposeAndSign({
                account,
                address: selectedQuote.dexTx.to,
                amount: selectedQuote.dexTx.value,
                destinationTag: selectedQuote.partnerPaymentExtraId,
                ethereumDataHex: selectedQuote.dexTx.data,
                recalcCustomLimit: true,
                ethereumAdjustGasLimit: selectedQuote.status === 'CONFIRM' ? '1.25' : undefined,
                setMaxOutputId: values.setMaxOutputId,
            });

            // in case of not success, recomposeAndSign shows notification
            if (result?.success) {
                const { txid } = result.payload;
                const quote = { ...selectedQuote };
                if (selectedQuote.status === 'CONFIRM' && selectedQuote.approvalType !== 'ZERO') {
                    quote.receiveTxHash = txid;
                    quote.status = 'CONFIRMING';
                    dispatch(
                        coinmarketExchangeActions.saveTrade(
                            quote,
                            selectedAccount.account,
                            new Date().toISOString(),
                        ),
                    );
                    confirmTrade(quote.receiveAddress || '', undefined, quote);
                } else {
                    quote.approvalSendTxHash = txid;
                    quote.status = 'APPROVAL_PENDING';
                    confirmTrade(quote.receiveAddress || '', undefined, quote);
                }
            }
        } else {
            dispatch(
                notificationsActions.addToast({
                    type: 'error',
                    error: 'Cannot send transaction, missing data',
                }),
            );
        }
    };

    const sendTransaction = async () => {
        dispatch(coinmarketCommonActions.setCoinmarketModalAccount(account));

        if (selectedQuote?.isDex) {
            sendDexTransaction();

            return;
        }

        // sendAddress may be set by useCoinmarketWatchTrade hook to the trade object
        const sendAddress = selectedQuote?.sendAddress || trade?.data?.sendAddress;
        if (
            selectedQuote &&
            selectedQuote.orderId &&
            sendAddress &&
            selectedQuote.sendStringAmount
        ) {
            const sendStringAmount = shouldSendInSats
                ? amountToSmallestUnit(selectedQuote.sendStringAmount, decimals)
                : selectedQuote.sendStringAmount;
            const sendPaymentExtraId =
                selectedQuote.partnerPaymentExtraId || trade?.data?.partnerPaymentExtraId;
            const result = await recomposeAndSign({
                account,
                address: sendAddress,
                amount: sendStringAmount,
                destinationTag: sendPaymentExtraId,
                setMaxOutputId: values.setMaxOutputId,
            });
            // in case of not success, recomposeAndSign shows notification
            if (result?.success) {
                dispatch(
                    coinmarketExchangeActions.saveTrade(
                        selectedQuote,
                        selectedAccount.account,
                        new Date().toISOString(),
                    ),
                );
                dispatch(coinmarketExchangeActions.saveTransactionId(selectedQuote.orderId));
                navigateToExchangeDetail();
            }
        } else {
            dispatch(
                notificationsActions.addToast({
                    type: 'error',
                    error: 'Cannot send transaction, missing data',
                }),
            );
        }
    };

    const goToOffers = async () => {
        await handleChange(true);

        navigateToExchangeOffers();
    };

    useCoinmarketLoadData();
    useCoinmarketModalCrypto({
        receiveCurrency: values.receiveCryptoSelect?.value as CryptoId | undefined,
    });

    useDebounce(
        () => {
            if (
                formState.isDirty &&
                !formState.isValidating &&
                Object.keys(formState.errors).length === 0 &&
                !isComposing
            ) {
                saveDraft(exchangeDraftKey, values as CoinmarketExchangeFormProps);
            }
        },
        200,
        [
            saveDraft,
            values,
            formState.errors,
            formState.isDirty,
            formState.isValidating,
            isComposing,
        ],
    );

    useEffect(() => {
        if (!isChanged(defaultValues, values)) {
            removeDraft(exchangeDraftKey);

            return;
        }

        if (values.sendCryptoSelect && !values.sendCryptoSelect?.value) {
            removeDraft(exchangeDraftKey);

            return;
        }

        if (values.receiveCryptoSelect && !values.receiveCryptoSelect?.value) {
            removeDraft(exchangeDraftKey);
        }
    }, [defaultValues, values, removeDraft]);

    // react-hook-form auto register custom form fields (without HTMLElement)
    useEffect(() => {
        register('options');
        register('setMaxOutputId');
    }, [register]);

    // react-hook-form reset, set default values
    useEffect(() => {
        if (!isDraft && defaultValues) {
            reset(defaultValues);
        }
    }, [reset, isDraft, defaultValues]);

    useEffect(() => {
        if (!quotesRequest && isNotFormPage) {
            navigateToExchangeForm();

            return;
        }

        if (isFromRedirect) {
            if (transactionId && trade) {
                dispatch(coinmarketExchangeActions.saveSelectedQuote(trade.data));
                setExchangeStep('SEND_TRANSACTION');
            }

            dispatch(coinmarketExchangeActions.setIsFromRedirect(false));
        }

        checkQuotesTimer(handleChange);
    }, [
        quotesRequest,
        isFromRedirect,
        trade,
        transactionId,
        isNotFormPage,
        dispatch,
        navigateToExchangeForm,
        checkQuotesTimer,
        handleChange,
    ]);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // handle edge case when there are no longer quotes of selected exchange type
    useEffect(() => {
        if (exchangeType === FORM_EXCHANGE_DEX && !dexQuotes?.length && filteredCexQuotes?.length) {
            setValue(FORM_EXCHANGE_TYPE, FORM_EXCHANGE_CEX);
        } else if (
            exchangeType === FORM_EXCHANGE_CEX &&
            !filteredCexQuotes?.length &&
            dexQuotes?.length
        ) {
            setValue(FORM_EXCHANGE_TYPE, FORM_EXCHANGE_DEX);
        } else if (
            exchangeType === FORM_EXCHANGE_DEX &&
            !dexQuotes?.length &&
            !filteredCexQuotes?.length
        ) {
            setValue(FORM_EXCHANGE_TYPE, FORM_EXCHANGE_CEX);
        }
    }, [dexQuotes, exchangeType, filteredCexQuotes, setValue]);

    return {
        type,
        ...methods,
        account,

        form: {
            state: {
                isFormLoading,
                isFormInvalid,
                isLoadingOrInvalid,

                toggleAmountInCrypto,
            },
            helpers,
        },

        device,
        timer,
        callInProgress,
        exchangeInfo,
        allQuotes: innerQuotes,
        quotes: filteredCexQuotes,
        dexQuotes,
        quotesRequest,
        composedLevels,
        defaultCurrency,
        feeInfo,
        amountLimits,
        network,
        exchangeStep,
        receiveAccount,
        selectedQuote,
        addressVerified,
        shouldSendInSats,
        trade,
        setReceiveAccount,
        composeRequest,
        changeFeeLevel,
        removeDraft,
        setAmountLimits,
        goToOffers,
        setExchangeStep,
        sendTransaction,
        verifyAddress: coinmarketExchangeActions.verifyAddress,
        selectQuote,
        confirmTrade,
    };
};
