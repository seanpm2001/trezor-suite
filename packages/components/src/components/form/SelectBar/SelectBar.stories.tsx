import { useArgs } from '@storybook/client-api';
import { Meta, StoryObj } from '@storybook/react';

import { fillTypes, SelectBar as SelectBarComponent, SelectBarProps } from './SelectBar';
import { IconName } from '../../Icon/Icon';

const options = [
    { label: 'low', value: 'low' },
    { label: 'medium', value: 'medium' },
    { label: 'high', value: 'high' },
    { label: 'custom', value: 'custom', icon: 'clock' as IconName },
];

const meta: Meta = {
    title: 'Form',
    args: {
        label: 'fee',
        options,
        selectedOption: 'low',
        isDisabled: false,
        isFullWidth: undefined,
        fillType: 'default',
    },
    argTypes: {
        label: {
            control: {
                type: 'text',
            },
        },
        options: {
            control: {
                type: 'array',
            },
            table: {
                type: {
                    summary: 'Array<{ label: string; value: number }>',
                },
            },
        },
        selectedOption: {
            control: {
                type: 'text',
            },
        },
        isDisabled: {
            control: {
                type: 'boolean',
            },
        },
        isFullWidth: {
            control: {
                type: 'boolean',
            },
        },
        fillType: {
            control: {
                type: 'radio',
            },
            options: fillTypes,
        },
    },
    component: SelectBarComponent,
} as unknown as Meta;
export default meta;

export const SelectBar: StoryObj<SelectBarProps<string>> = {
    render: ({ ...args }) => {
        // eslint-disable-next-line
        const [_, updateArgs] = useArgs<SelectBarProps<string>>();
        const setOption = (selectedOption: string) => updateArgs({ selectedOption });

        return <SelectBarComponent {...args} onChange={setOption} options={options} />;
    },
};
