import { DISCREET_PLACEHOLDER, useShouldRedactNumbers } from '@suite-common/wallet-utils';

import { Translation } from 'src/components/suite';

export const NumberOfTransactions = ({ value }: { value: number }) => (
    <Translation
        id="TR_N_TRANSACTIONS"
        values={{ value: useShouldRedactNumbers() ? DISCREET_PLACEHOLDER : value }}
    />
);
