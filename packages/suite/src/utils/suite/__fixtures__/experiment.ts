import { getWeakRandomId } from '@trezor/utils';

// getWeakRandomId is also used for generating instanceId
export const getArrayOfInstanceIds = (count: number) =>
    Array.from({ length: count }, () => getWeakRandomId(10));

export const experimentTest = {
    id: 'experiment-test',
    groups: [
        {
            variant: 'A',
            percentage: 20,
        },
        {
            variant: 'B',
            percentage: 80,
        },
    ],
};
