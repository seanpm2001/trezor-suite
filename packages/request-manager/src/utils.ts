import { createTimeoutPromise } from '@trezor/utils';

export const waitUntil = (
    MAX_TRIES_WAITING: number,
    WAITING_TIME: number,
    checkToSuccess: () => Promise<boolean>,
    getIsStopped: () => boolean,
): Promise<void> => {
    const errorMessages: string[] = [];

    const waitUntilResponse = async (triesCount: number): Promise<void> => {
        if (getIsStopped()) {
            // If stopped we do not wait anymore.
            return;
        }
        if (triesCount >= MAX_TRIES_WAITING) {
            throw new Error(`Timeout waiting: \n${errorMessages.join('\n')}`);
        }
        try {
            const completed = await checkToSuccess();
            if (completed) {
                return;
            }
        } catch (error) {
            // Some error here is expected when waiting but
            // we do not want to throw until MAX_TRIES_WAITING is reach.
            // Instead we want to log it to know what causes the error.
            if (error && error.message) {
                console.warn('error:', error.message);
                errorMessages.push(error.message);
            }
        }
        await createTimeoutPromise(WAITING_TIME);

        return waitUntilResponse(triesCount + 1);
    };

    return waitUntilResponse(1);
};
