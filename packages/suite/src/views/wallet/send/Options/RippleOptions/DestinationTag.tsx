import { BigNumber } from '@trezor/utils/src/bigNumber';
import { Input, Icon } from '@trezor/components';
import { getInputState, isInteger } from '@suite-common/wallet-utils';
import { U_INT_32 } from '@suite-common/wallet-constants';
import { formInputsMaxLength } from '@suite-common/validators';

import { Translation } from 'src/components/suite';
import { useSendFormContext } from 'src/hooks/wallet';
import { useTranslation } from 'src/hooks/suite';

interface DestinationTagProps {
    close: () => void;
}

export const DestinationTag = ({ close }: DestinationTagProps) => {
    const {
        register,
        getDefaultValue,
        formState: { errors },
        composeTransaction,
    } = useSendFormContext();

    const { translationString } = useTranslation();

    const inputName = 'rippleDestinationTag';
    const inputValue = getDefaultValue(inputName) || '';
    const error = errors[inputName];
    const { ref: inputRef, ...inputField } = register(inputName, {
        onChange: () => composeTransaction(inputName),
        required: translationString('DESTINATION_TAG_NOT_SET'),
        validate: (value = '') => {
            const amountBig = new BigNumber(value);
            if (amountBig.isNaN()) {
                return translationString('DESTINATION_TAG_IS_NOT_NUMBER');
            }
            if (!isInteger(value) || amountBig.lt(0) || amountBig.gt(U_INT_32)) {
                return translationString('DESTINATION_TAG_IS_NOT_VALID');
            }
        },
    });

    return (
        <Input
            inputState={getInputState(error)}
            data-testid={inputName}
            defaultValue={inputValue}
            maxLength={formInputsMaxLength.xrpDestinationTag}
            label={<Translation id="DESTINATION_TAG" />}
            labelRight={<Icon size={20} name="close" cursorPointer onClick={close} />}
            bottomText={error?.message || null}
            innerRef={inputRef}
            {...inputField}
        />
    );
};
