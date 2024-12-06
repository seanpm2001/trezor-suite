import { DeviceModelInternal } from '@trezor/protobuf';

type ModelConfig = {
    name: string;
    colors: Record<string, string>;
};

const safe3Model: ModelConfig = {
    name: 'Trezor Safe 3',
    colors: {
        '1': 'Cosmic Black',
        '2': 'Stellar Silver',
        '3': 'Solar Gold',
        '4': 'Galactic Rose',
        '5': 'Bitcoin Orange',
    },
};

export const models: Record<DeviceModelInternal, ModelConfig> = {
    T1B1: {
        name: 'Trezor Model One',
        colors: {},
    },
    T2T1: {
        name: 'Trezor Model T',
        colors: {},
    },
    T2B1: safe3Model,
    T3B1: safe3Model,
    T3T1: {
        name: 'Trezor Safe 5',
        colors: {
            '1': 'Black Graphite',
            '2': 'Violet Ore',
            '3': 'Green Beryl',
            '4': 'Bitcoin Orange',
            '5': 'Special Edition', // TODO T3T1 - Special Edition, do not forget to update the animation (rotation) as well
        },
    },
    T3W1: {
        name: 'Trezor Safe 7',
        colors: {
            '1': 'Fantastic Ethereum', // TODO T3W1
            '2': 'Lunatic Dogecoin', // TODO T3W1
            '3': 'Galactic Litecoin', // TODO T3W1
            '4': 'Majestic Bitcoin', // TODO T3W1
        },
    },
    UNKNOWN: {
        name: 'Unknown',
        colors: safe3Model.colors, // just in case
    },
};
