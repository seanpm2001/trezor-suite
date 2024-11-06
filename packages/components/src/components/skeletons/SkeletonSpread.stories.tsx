import { Meta, StoryObj } from '@storybook/react';
import styled from 'styled-components';

import { SkeletonSpread as SkeletonSpreadComponent, SkeletonSpreadProps } from './SkeletonSpread';
import { SkeletonCircle } from './SkeletonCircle';
import { ElevationContext } from '../ElevationContext/ElevationContext';

const Container = styled.div`
    width: 600px;
`;

const meta: Meta = {
    title: 'Skeletons',
    component: SkeletonSpreadComponent,
} as Meta;
export default meta;

export const SkeletonSpread: StoryObj<SkeletonSpreadProps> = {
    render: args => (
        <Container>
            <ElevationContext baseElevation={1}>
                <SkeletonSpreadComponent {...args}>
                    <SkeletonCircle size={50} />
                    <SkeletonCircle size={50} />
                    <SkeletonCircle size={50} />
                </SkeletonSpreadComponent>
            </ElevationContext>
        </Container>
    ),
    args: {
        $spaceAround: false,
    },
};
