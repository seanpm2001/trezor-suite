import styled, { useTheme } from 'styled-components';

import { Tooltip, Icon, useElevation } from '@trezor/components';
import { Elevation, borders, mapElevationToBackground, spacingsPx } from '@trezor/theme';

import { Translation } from 'src/components/suite';

import { ContentType } from '../types';

const EjectContainer = styled.div<{ $elevation: Elevation }>`
    position: absolute;
    right: ${spacingsPx.xs};
    top: ${spacingsPx.xs};
    background-color: ${mapElevationToBackground};
    border-radius: ${borders.radii.full};
    padding: ${spacingsPx.xxs};
`;

interface EjectButtonProps {
    setContentType: (contentType: ContentType) => void;
    'data-testid'?: string;
}

export const EjectButton = ({ setContentType, 'data-testid': dataTest }: EjectButtonProps) => {
    const theme = useTheme();

    const onEjectClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        setContentType('eject-confirmation');
        e.stopPropagation();
    };

    const { elevation } = useElevation();

    return (
        <EjectContainer $elevation={elevation}>
            <Tooltip cursor="pointer" content={<Translation id="TR_EJECT_HEADING" />}>
                <Icon
                    data-testid={`${dataTest}/eject-button`}
                    name="eject"
                    size={22}
                    color={theme.legacy.TYPE_LIGHT_GREY}
                    hoverColor={theme.legacy.TYPE_DARK_GREY}
                    onClick={onEjectClick}
                />
            </Tooltip>
        </EjectContainer>
    );
};
