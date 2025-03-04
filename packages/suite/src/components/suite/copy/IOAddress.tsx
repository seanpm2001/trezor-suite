import { useState } from 'react';

import styled, { css, useTheme } from 'styled-components';

import { Icon, Link, Text } from '@trezor/components';
import { copyToClipboard } from '@trezor/dom-utils';

import { HiddenPlaceholder } from 'src/components/suite/HiddenPlaceholder';

const IconWrapper = styled.div`
    display: none;
    padding: 1px;
    border-radius: 2px;
    margin-left: 4px;
    background-color: ${({ theme }) => theme.iconSubdued};
    height: 14px;

    &:hover {
        opacity: 0.7;
    }
`;

const onHoverTextOverflowContainerHover = css`
    border-radius: 2px;
    background-color: ${({ theme }) => theme.backgroundSurfaceElevation2};
    outline: 4px solid ${({ theme }) => theme.backgroundSurfaceElevation2};
    z-index: 3;

    ${IconWrapper} {
        display: block;
    }
`;

const TextOverflowContainer = styled.div<{ $shouldAllowCopy?: boolean }>`
    position: relative;
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    overflow: hidden;
    cursor: ${({ $shouldAllowCopy }) => ($shouldAllowCopy ? 'pointer' : 'cursor')};
    user-select: none;

    ${({ $shouldAllowCopy }) =>
        $shouldAllowCopy &&
        css`
            @media (hover: none) {
                ${onHoverTextOverflowContainerHover}
            }

            &:hover,
            &:focus {
                ${onHoverTextOverflowContainerHover}
            }
        `}
`;

const SpanTextStart = styled.span`
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const SpanTextEnd = styled.span`
    display: inline-block;
`;

interface IOAddressProps {
    explorerUrl?: string;
    txAddress?: string;
    explorerUrlQueryString?: string;
    shouldAllowCopy?: boolean;
}

export const IOAddress = ({
    txAddress,
    explorerUrl,
    explorerUrlQueryString = '',
    shouldAllowCopy = true,
}: IOAddressProps) => {
    const [isClicked, setIsClicked] = useState(false);
    const theme = useTheme();

    const copy = () => {
        if (!shouldAllowCopy) {
            return;
        }

        copyToClipboard(txAddress || '');

        setIsClicked(true);
    };

    if (!txAddress) {
        return null;
    }

    // HiddenPlaceholder disableKeepingWidth: it isn't needed (no numbers to redact), but inline-block disrupts overflow behavior
    return (
        <Text typographyStyle="label" variant="default">
            <HiddenPlaceholder disableKeepingWidth>
                <TextOverflowContainer
                    onMouseLeave={() => setIsClicked(false)}
                    data-testid="@tx-detail/txid-value"
                    id={txAddress}
                    $shouldAllowCopy={shouldAllowCopy}
                >
                    {txAddress.length <= 5 ? (
                        <SpanTextEnd onClick={copy}>{txAddress}</SpanTextEnd>
                    ) : (
                        <>
                            <SpanTextStart onClick={copy}>{txAddress.slice(0, -4)}</SpanTextStart>
                            <SpanTextEnd onClick={copy}>{txAddress.slice(-4)}</SpanTextEnd>
                        </>
                    )}
                    {shouldAllowCopy ? (
                        <IconWrapper onClick={copy}>
                            <Icon
                                name={isClicked ? 'check' : 'copy'}
                                size={12}
                                color={theme.iconOnPrimary}
                            />
                        </IconWrapper>
                    ) : null}
                    {explorerUrl ? (
                        <IconWrapper>
                            <Link
                                typographyStyle="label"
                                variant="nostyle"
                                href={`${explorerUrl}${txAddress}${explorerUrlQueryString}`}
                            >
                                <Icon name="arrowUpRight" size={12} color={theme.iconOnPrimary} />
                            </Link>
                        </IconWrapper>
                    ) : null}
                </TextOverflowContainer>
            </HiddenPlaceholder>
        </Text>
    );
};
