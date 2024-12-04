import { ImgHTMLAttributes } from 'react';

import styled from 'styled-components';

import {
    FrameProps,
    FramePropsKeys,
    pickAndPrepareFrameProps,
    withFrameProps,
} from '../../utils/frameProps';
import { PNG_IMAGES, SVG_IMAGES, PngImage, SvgImage } from './images';
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

export type ImageKey = PngImage | SvgImage;

const buildSrcSet = (basePath: string, images: typeof PNG_IMAGES, imageKey: PngImage) => {
    const imageFile1x = images[imageKey];
    const hiRes = `${String(imageKey)}_2x` as PngImage;
    const imageFile2x = hiRes in images ? images[hiRes] : undefined;

    if (!imageFile2x) {
        return undefined;
    }

    return `${resolveStaticPath(`${basePath}/${imageFile1x}`)} 1x, ${resolveStaticPath(
        `${basePath}/${imageFile2x}`,
    )} 2x`;
};

const getSourceProps = (image: ImageKey) => {
    const path = image in PNG_IMAGES ? PNG_PATH : SVG_PATH;
    const images =
        image in PNG_IMAGES ? (PNG_IMAGES as typeof PNG_IMAGES) : (SVG_IMAGES as typeof SVG_IMAGES);

    return {
        src: resolveStaticPath(`${path}/${images[image as keyof typeof images]}`),
        srcSet:
            image in PNG_IMAGES
                ? buildSrcSet(path, images as typeof PNG_IMAGES, image as PngImage)
                : undefined,
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
