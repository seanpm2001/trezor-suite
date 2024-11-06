import { css, DefaultTheme, RuleSet } from 'styled-components';

import {
    spacingsPx,
    Elevation,
    mapElevationToBackground,
    mapElevationToBorder,
} from '@trezor/theme';

import { PaddingType, FillType } from './types';

type PaddingMapArgs = {
    $paddingType: PaddingType;
};

type FillTypeMapArgs = {
    $fillType: FillType;
    $elevation: Elevation;
    $isClickable: boolean;
    $hasLabel: boolean;
    theme: DefaultTheme;
};

export const mapPaddingTypeToLabelPadding = ({ $paddingType }: PaddingMapArgs): number | string => {
    const paddingMap: Record<PaddingType, number | string> = {
        none: `${spacingsPx.xxs} 0`,
        small: `${spacingsPx.xxs} ${spacingsPx.sm}`,
        normal: `${spacingsPx.xs} ${spacingsPx.lg}`,
        large: `${spacingsPx.sm} ${spacingsPx.xl}`,
    };

    return paddingMap[$paddingType];
};

export const mapPaddingTypeToPadding = ({ $paddingType }: PaddingMapArgs): number | string => {
    const paddingMap: Record<PaddingType, number | string> = {
        none: 0,
        small: spacingsPx.sm,
        normal: spacingsPx.lg,
        large: spacingsPx.xl,
    };

    return paddingMap[$paddingType];
};

export const mapFillTypeToCSS = ({
    $fillType,
    $elevation,
    $isClickable,
    $hasLabel,
    theme,
}: FillTypeMapArgs): RuleSet<object> => {
    const cssMap: Record<FillType, RuleSet<object>> = {
        default: css`
            background: ${mapElevationToBackground({ $elevation, theme })};
            box-shadow: ${$elevation === 1 && !$hasLabel && theme.boxShadowBase};

            ${$isClickable &&
            css`
                &:hover {
                    box-shadow: ${$elevation === 1 && theme.boxShadowElevated};
                }
            `}
        `,
        none: css`
            border: 1px solid ${mapElevationToBorder({ $elevation, theme })};
        `,
    };

    return cssMap[$fillType];
};
