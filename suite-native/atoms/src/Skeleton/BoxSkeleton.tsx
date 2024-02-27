import React, { useEffect, useMemo } from 'react';
import {
    interpolate,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { Canvas, vec, Rect, LinearGradient, Group, rrect, rect } from '@shopify/react-native-skia';

import { useNativeStyles } from '@trezor/styles';
import { nativeBorders } from '@trezor/theme';

type BoxSkeletonProps = {
    height: number;
    width: number;
    borderRadius?: number;
};

const ANIMATION_DURATION = 1200;

export const BoxSkeleton = ({
    height,
    width,
    borderRadius = nativeBorders.radii.small,
}: BoxSkeletonProps) => {
    const {
        utils: { colors },
    } = useNativeStyles();
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(withTiming(width, { duration: ANIMATION_DURATION }), -1);
    }, [width, progress]);

    const position = useDerivedValue(() => [
        {
            translateX: interpolate(progress.value, [0, width], [-width, width]),
        },
    ]);

    const shapeRect = useMemo(() => {
        const coreRect = rect(0, 0, width, height);

        return rrect(coreRect, borderRadius, borderRadius);
    }, [width, height, borderRadius]);

    const gradientRect = useMemo(() => rect(0, 0, width, height), [width, height]);

    const gradientColors = useMemo(
        () => [
            colors.backgroundSurfaceElevation1,
            colors.backgroundSurfaceElevationNegative,
            colors.backgroundSurfaceElevation1,
        ],
        [colors],
    );

    return (
        <Canvas style={{ width, height }}>
            <Group clip={shapeRect}>
                <Group transform={position}>
                    <Rect rect={gradientRect}>
                        <LinearGradient
                            start={vec(0, height / 2)}
                            end={vec(width, height / 2)}
                            colors={gradientColors}
                        />
                    </Rect>
                </Group>
            </Group>
        </Canvas>
    );
};
