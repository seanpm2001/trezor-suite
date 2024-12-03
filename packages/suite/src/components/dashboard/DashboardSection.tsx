import { Ref, forwardRef, ReactElement, HTMLAttributes } from 'react';

import { H3, Column, Row } from '@trezor/components';
import { spacings } from '@trezor/theme';
import styled from 'styled-components';

type DashboardSectionProps = HTMLAttributes<HTMLDivElement> & {
    heading: ReactElement;
    actions?: ReactElement;
    'data-testid'?: string;
};

const Container = styled.div`
    height: 100%;
`;

export const DashboardSection = forwardRef(
    (
        { heading, actions, children, 'data-testid': dataTestId, ...rest }: DashboardSectionProps,
        ref: Ref<HTMLDivElement>,
    ) => (
        <Container ref={ref} {...rest}>
            <Column data-testid={dataTestId} height="100%">
                <Row as="header" justifyContent="space-between" margin={{ bottom: spacings.lg }}>
                    {heading && (
                        <H3>
                            <Row as="span">{heading}</Row>
                        </H3>
                    )}
                    {actions && <div>{actions}</div>}
                </Row>
                {children}
            </Column>
        </Container>
    ),
);
