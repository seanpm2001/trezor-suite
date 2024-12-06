import { ImgHTMLAttributes } from 'react';

import styled from 'styled-components';

import {
    FrameProps,
    FramePropsKeys,
    pickAndPrepareFrameProps,
    withFrameProps,
} from '../../utils/frameProps';
import { PNG_IMAGES, SVG_IMAGES, PngImageKey, SvgImageKey } from './images';
import { TransientProps } from '../../utils/transientProps';
import { resolveStaticPath } from '../../utils/resolveStaticPath';

export const allowedImageFrameProps = [
    'margin',
    'width',
    'height',
    'flex',
] as const satisfies FramePropsKeys[];
type AllowedFrameProps = Pick<FrameProps, (typeof allowedImageFrameProps)[number]>;

export const PNG_PATH = 'images/png';
export const SVG_PATH = 'images/svg';

export type ImageKey = PngImageKey | SvgImageKey;

const buildPngSrcSet = (imageKey: PngImageKey) => {
    const basePath = PNG_PATH;
    const imageFile1x = PNG_IMAGES[imageKey];
    const hiRes = `${String(imageKey)}_2x` as PngImageKey;
    const imageFile2x = hiRes in PNG_IMAGES ? PNG_IMAGES[hiRes] : undefined;

    if (!imageFile2x) {
        return undefined;
    }

    return `${resolveStaticPath(`${basePath}/${imageFile1x}`)} 1x, ${resolveStaticPath(
        `${basePath}/${imageFile2x}`,
    )} 2x`;
};

const isPNGImageKey = (key: ImageKey): key is PngImageKey => key in PNG_IMAGES;

const getSourceProps = (imageKey: ImageKey) => {
    if (isPNGImageKey(imageKey)) {
        return {
            src: resolveStaticPath(`${imageKey}/${PNG_IMAGES[imageKey]}`),
            srcSet: buildPngSrcSet(imageKey),
        };
    }

    return {
        src: resolveStaticPath(`${SVG_PATH}/${SVG_IMAGES[imageKey]}`),
        srcSet: undefined,
    };
};

const StyledImage = styled.img<TransientProps<AllowedFrameProps>>`
    max-width: 100%;
    filter: ${({ theme }) => theme.legacy.IMAGE_FILTER};

    ${withFrameProps}
`;

type ImageHTMLProps = ImgHTMLAttributes<Omit<HTMLImageElement, 'src' | 'width' | 'height'>>;

export type ImageProps = AllowedFrameProps &
    ImageHTMLProps &
    (
        | {
              image: ImageKey;
              imageSrc?: never;
          }
        | {
              image?: never;
              imageSrc: string;
          }
    );

export const Image = ({ image, imageSrc, ...rest }: ImageProps) => {
    const frameProps = pickAndPrepareFrameProps(rest, allowedImageFrameProps);
    const imageProps = Object.entries(rest).reduce((props, [propKey, propValue]) => {
        if (!(propKey in frameProps)) {
            props[propKey as keyof ImageHTMLProps] = propValue;
        }

        return props;
    }, {} as ImageHTMLProps);
    const sourceProps = image ? getSourceProps(image) : { src: imageSrc };

    return <StyledImage {...sourceProps} {...imageProps} {...frameProps} />;
};
