import { useState } from 'react';

import styled from 'styled-components';

import { variables } from '@trezor/components';
import { Deferred } from '@trezor/utils';
import {
    DeviceRootState,
    selectDevice,
    selectPrecomposedSendForm,
    selectSendFormReviewButtonRequestsCount,
    selectStakePrecomposedForm,
    StakeState,
    SendState,
} from '@suite-common/wallet-core';
import { FormState, StakeFormState } from '@suite-common/wallet-types';
import {
    constructTransactionReviewOutputs,
    isRbfTransaction,
    getTxStakeNameByDataHex,
} from '@suite-common/wallet-utils';
import { ConfirmOnDevice } from '@trezor/product-components';
import { networks } from '@suite-common/wallet-config';

import { useSelector } from 'src/hooks/suite';
import { selectIsActionAbortable } from 'src/reducers/suite/suiteReducer';
import { getTransactionReviewModalActionText } from 'src/utils/suite/transactionReview';
import { Modal, Translation } from 'src/components/suite';
import { selectAccountIncludingChosenInCoinmarket } from 'src/reducers/wallet/selectedAccountReducer';

import { TransactionReviewSummary } from './TransactionReviewSummary';
import { TransactionReviewOutputList } from './TransactionReviewOutputList/TransactionReviewOutputList';
import { TransactionReviewEvmExplanation } from './TransactionReviewEvmExplanation';
import { ConfirmActionModal } from '../DeviceContextModal/ConfirmActionModal';

const StyledModal = styled(Modal)`
    ${Modal.Body} {
        padding: 10px;
        margin-bottom: 0;
    }
    ${Modal.Content} {
        @media (min-width: ${variables.SCREEN_SIZE.SM}) {
            flex-flow: row wrap;
        }
    }
`;

const isStakeState = (state: SendState | StakeState): state is StakeState => {
    return 'data' in state;
};

const isStakeForm = (form: FormState | StakeFormState): form is StakeFormState => {
    return 'ethereumStakeType' in form;
};

interface TransactionReviewModalContentProps {
    decision: Deferred<boolean, string | number | undefined> | undefined;
    txInfoState: SendState | StakeState;
    cancelSignTx: () => void;
}

export const TransactionReviewModalContent = ({
    decision,
    txInfoState,
    cancelSignTx,
}: TransactionReviewModalContentProps) => {
    const account = useSelector(selectAccountIncludingChosenInCoinmarket);
    const fees = useSelector(state => state.wallet.fees);
    const device = useSelector(selectDevice);
    const isActionAbortable = useSelector(selectIsActionAbortable);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const deviceModelInternal = device?.features?.internal_model;
    const { precomposedTx, serializedTx } = txInfoState;

    const precomposedForm = useSelector(state =>
        isStakeState(txInfoState)
            ? selectStakePrecomposedForm(state)
            : selectPrecomposedSendForm(state),
    );

    const isRbfAction = precomposedTx !== undefined && isRbfTransaction(precomposedTx);

    const decreaseOutputId =
        isRbfAction && precomposedTx.useNativeRbf ? precomposedForm?.setMaxOutputId : undefined;

    const buttonRequestsCount = useSelector((state: DeviceRootState) =>
        selectSendFormReviewButtonRequestsCount(state, account?.symbol, decreaseOutputId),
    );

    if (!device) return null;
    if (!account || !precomposedTx || !precomposedForm) {
        // TODO: special case for Connect Popup
        return <ConfirmActionModal device={device} />;
    }

    const network = networks[account.symbol];

    const { networkType } = account;

    const outputs = constructTransactionReviewOutputs({
        account,
        decreaseOutputId,
        device,
        precomposedForm,
        precomposedTx,
    });

    // for bump fee we have to analyze tx data which are in outputs[0]
    const ethereumStakeType = isStakeForm(precomposedForm)
        ? precomposedForm.ethereumStakeType
        : getTxStakeNameByDataHex(outputs[0]?.value);

    // get estimate mining time
    let estimateTime;
    const symbolFees = fees[account.symbol];
    const matchedFeeLevel = symbolFees.levels.find(
        item => item.feePerUnit === precomposedTx.feePerByte,
    );

    if (networkType === 'bitcoin' && matchedFeeLevel) {
        estimateTime = symbolFees.blockTime * matchedFeeLevel.blocks * 60;
    }

    const onCancel =
        isActionAbortable || serializedTx
            ? () => {
                  cancelSignTx();
                  decision?.resolve(false);
              }
            : undefined;

    return (
        <StyledModal
            modalPrompt={
                <ConfirmOnDevice
                    title={<Translation id="TR_CONFIRM_ON_TREZOR" />}
                    steps={outputs.length + 1}
                    activeStep={serializedTx ? outputs.length + 2 : buttonRequestsCount}
                    deviceModelInternal={deviceModelInternal}
                    deviceUnitColor={device?.features?.unit_color}
                    successText={<Translation id="TR_CONFIRMED_TX" />}
                    onCancel={onCancel}
                />
            }
        >
            <TransactionReviewSummary
                estimateTime={estimateTime}
                tx={precomposedTx}
                account={account}
                network={network}
                broadcast={precomposedForm.options.includes('broadcast')}
                detailsOpen={detailsOpen}
                onDetailsClick={() => setDetailsOpen(!detailsOpen)}
                ethereumStakeType={ethereumStakeType}
                actionText={getTransactionReviewModalActionText({
                    ethereumStakeType,
                    isRbfAction,
                })}
            />
            <TransactionReviewOutputList
                account={account}
                precomposedForm={precomposedForm}
                precomposedTx={precomposedTx}
                signedTx={serializedTx}
                decision={decision}
                detailsOpen={detailsOpen}
                outputs={outputs}
                buttonRequestsCount={buttonRequestsCount}
                isRbfAction={isRbfAction}
                actionText={getTransactionReviewModalActionText({
                    ethereumStakeType,
                    isRbfAction,
                    isSending,
                })}
                isSending={isSending}
                setIsSending={() => setIsSending(true)}
                ethereumStakeType={ethereumStakeType || undefined}
            />
            <TransactionReviewEvmExplanation
                account={account}
                ethereumStakeType={ethereumStakeType}
            />
        </StyledModal>
    );
};
