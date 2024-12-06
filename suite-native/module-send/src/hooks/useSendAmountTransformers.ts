import { useSelector } from 'react-redux';

import { type NetworkSymbol } from '@suite-common/wallet-config';
import { selectIsAmountInSats, SettingsSliceRootState } from '@suite-native/settings';

export const decimalTransformer = (value: string) =>
    value
        .replace(/,/g, '.') // remove all non-numeric characters
        .replace(/[^\d.]/g, '') // remove all non-numeric characters
        .replace(/^\./g, '') // remove '.' symbol if it is not preceded by number
        .replace(/(?<=\..*)\./g, '') // keep only first appearance of the '.' symbol
        .replace(/^0+(?=\d)/g, ''); // remove all leading zeros except the first one

export const integerTransformer = (value: string) =>
    value
        .replace(/\D/g, '') // remove all non-digit characters
        .replace(/^0+(?=\d)/g, ''); // remove all leading zeros except the first one

export const useSendAmountTransformers = (symbol: NetworkSymbol | undefined) => {
    const isAmountInSats = useSelector((state: SettingsSliceRootState) =>
        selectIsAmountInSats(state, symbol),
    );

    return {
        cryptoAmountTransformer: isAmountInSats ? integerTransformer : decimalTransformer,
        fiatAmountTransformer: decimalTransformer,
    };
};
