import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { useRoute, RouteProp } from '@react-navigation/native';
import { checkAddressCheckSum, toChecksumAddress } from 'web3-utils';
import { G } from '@mobily/ts-belt';

import { SendStackParamList, SendStackRoutes } from '@suite-native/navigation';
import { Translation } from '@suite-native/intl';
import { selectAccountTokenSymbol, TokensRootState } from '@suite-native/tokens';
import { useAlert } from '@suite-native/alerts';
import { useFormContext } from '@suite-native/forms';
import { isAddressValid } from '@suite-common/wallet-utils';
import { AccountsRootState, selectAccountNetworkSymbol } from '@suite-common/wallet-core';
import TrezorConnect from '@trezor/connect';
import { Link } from '@suite-native/link';
import { getNetworkType } from '@suite-common/wallet-config';

import { getOutputFieldName } from '../utils';
import { TokenOfNetworkAlertBody } from '../components/TokenOfNetworkAlertContent';

type UseAddressValidationAlertsArgs = {
    inputIndex: number;
};

const CHECKSUM_LINK_URL = 'https://trezor.io/learn/a/evm-address-checksum-in-trezor-suite';

export const useAddressValidationAlerts = ({ inputIndex }: UseAddressValidationAlertsArgs) => {
    const {
        params: { tokenContract, accountKey },
    } = useRoute<RouteProp<SendStackParamList, SendStackRoutes.SendOutputs>>();
    const [wasAddressChecksummed, setWasAddressChecksummed] = useState(false);
    const [wasTokenAlertDisplayed, setWasTokenAlertDisplayed] = useState(
        G.isNullable(tokenContract),
    );
    const { showAlert } = useAlert();

    const tokenSymbol = useSelector((state: TokensRootState) =>
        selectAccountTokenSymbol(state, accountKey, tokenContract),
    );
    const symbol = useSelector((state: AccountsRootState) =>
        selectAccountNetworkSymbol(state, accountKey),
    );
    const networkType = symbol ? getNetworkType(symbol) : null;

    const { watch, setValue } = useFormContext();

    const addressFieldName = getOutputFieldName(inputIndex, 'address');
    const addressValue = watch(addressFieldName);

    const isFilledValidAddress = addressValue && symbol && isAddressValid(addressValue, symbol);

    const convertAddressToChecksum = useCallback(() => {
        setValue(addressFieldName, toChecksumAddress(addressValue), {
            shouldValidate: true,
        });
        setWasAddressChecksummed(true);
    }, [addressFieldName, addressValue, setValue]);

    const handleAddressChecksum = useCallback(async () => {
        if (isFilledValidAddress && !checkAddressCheckSum(addressValue)) {
            const params = {
                descriptor: addressValue,
                coin: symbol,
            };

            const addressInfo = await TrezorConnect.getAccountInfo(params);

            if (addressInfo.success) {
                // Already used addresses are checksumed without displaying the alert.
                const isUsedAddress = addressInfo.payload.history.total !== 0;
                if (isUsedAddress) {
                    convertAddressToChecksum();

                    return;
                }
            }

            showAlert({
                title: <Translation id="moduleSend.outputs.recipients.checksum.alert.title" />,
                description: (
                    <Translation
                        id="moduleSend.outputs.recipients.checksum.alert.body"
                        values={{
                            link: linkChunk => (
                                <Link
                                    href={CHECKSUM_LINK_URL}
                                    label={linkChunk}
                                    isUnderlined
                                    textColor="textSubdued"
                                />
                            ),
                        }}
                    />
                ),
                primaryButtonTitle: (
                    <Translation id="moduleSend.outputs.recipients.checksum.alert.primaryButton" />
                ),
                onPressPrimaryButton: convertAddressToChecksum,
            });
        }
    }, [addressValue, isFilledValidAddress, symbol, showAlert, convertAddressToChecksum]);

    useEffect(() => {
        const shouldShowTokenAlert =
            tokenContract && isFilledValidAddress && !wasTokenAlertDisplayed;
        const shouldChecksumAddress =
            networkType === 'ethereum' &&
            !wasAddressChecksummed &&
            isFilledValidAddress &&
            wasTokenAlertDisplayed;

        if (shouldShowTokenAlert) {
            showAlert({
                appendix: (
                    <TokenOfNetworkAlertBody
                        accountKey={accountKey}
                        tokenContract={tokenContract}
                    />
                ),
                primaryButtonTitle: <Translation id="generic.buttons.gotIt" />,
                onPressPrimaryButton: () => setWasTokenAlertDisplayed(true),
            });
        } else if (shouldChecksumAddress) handleAddressChecksum();
        // TODO: add path for contract address alert: https://github.com/trezor/trezor-suite/issues/14936.
        else if (!isFilledValidAddress) {
            if (tokenContract) setWasTokenAlertDisplayed(false);
            setWasAddressChecksummed(false);
        }
    }, [
        isFilledValidAddress,
        showAlert,
        tokenContract,
        tokenSymbol,
        accountKey,
        networkType,
        wasAddressChecksummed,
        handleAddressChecksum,
        wasTokenAlertDisplayed,
    ]);

    return { wasAddressChecksummed };
};
