import {
    useState,
    useRef,
    useLayoutEffect,
    forwardRef,
    useImperativeHandle,
    cloneElement,
    RefObject,
    ReactElement,
    MouseEvent,
    useEffect,
} from 'react';
import { createPortal } from 'react-dom';

import styled, { css } from 'styled-components';

import { useOnClickOutside } from '@trezor/react-utils';
import { borders } from '@trezor/theme';

import { Menu, MenuProps, DropdownMenuItemProps } from './Menu';
import { Coords, getAdjustedCoords } from './getAdjustedCoords';
import { IconButton } from '../buttons/IconButton/IconButton';
import { focusStyleTransition, getFocusShadowStyle } from '../../utils/utils';
import {
    FrameProps,
    FramePropsKeys,
    pickAndPrepareFrameProps,
    withFrameProps,
} from '../../utils/frameProps';
import { TransientProps } from '../../utils/transientProps';

export const allowedDropdownFrameProps = ['width'] as const satisfies FramePropsKeys[];
type AllowedFrameProps = Pick<FrameProps, (typeof allowedDropdownFrameProps)[number]>;

const MoreIcon = styled(IconButton)<{ $isToggled: boolean }>`
    background: ${({ isDisabled, $isToggled, theme }) =>
        !isDisabled && $isToggled && theme.backgroundNeutralSubdued};

    &:hover {
        background: ${({ theme, $isToggled }) => $isToggled && theme.backgroundNeutralSubdued};
    }
`;

const Container = styled.div<
    { $disabled?: boolean; $hasCustomChildren: boolean } & TransientProps<AllowedFrameProps>
>`
    all: unset;
    width: fit-content;
    height: fit-content;
    transition: ${focusStyleTransition};
    border: 1px solid transparent;
    ${getFocusShadowStyle()};
    cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};

    ${withFrameProps}

    ${({ $hasCustomChildren }) =>
        $hasCustomChildren
            ? undefined
            : css`
                  border-radius: ${borders.radii.full};
              `}
`;

const getPlacementData = (
    toggleRef: RefObject<HTMLElement>,
    menuRef: RefObject<HTMLUListElement>,
    clickPos: Coords | undefined,
) => {
    if (!toggleRef.current || !menuRef.current) {
        return {};
    }

    let coordsToUse: Coords;
    let toggleDimensions;
    if (clickPos) {
        coordsToUse = clickPos;
    } else {
        const { x, y, width, height } = toggleRef.current.getBoundingClientRect();

        coordsToUse = { x, y };
        toggleDimensions = { width, height };
    }

    if (!coordsToUse) {
        return {};
    }

    return { coordsToUse, toggleDimensions };
};

export type DropdownProps = Omit<MenuProps, 'setToggled'> &
    AllowedFrameProps & {
        isDisabled?: boolean;
        renderOnClickPosition?: boolean;
        onToggle?: (isToggled: boolean) => void;
        className?: string;
        'data-testid'?: string;
        children?: ((isToggled: boolean) => ReactElement<any>) | ReactElement<any>;
    };

export interface DropdownRef {
    close: () => void;
    open: () => void;
}

export type { DropdownMenuItemProps };

export const Dropdown = forwardRef(
    (
        {
            items,
            content,
            isDisabled,
            renderOnClickPosition,
            addon,
            alignMenu = 'bottom-left',
            offsetX,
            offsetY,
            onToggle,
            className,
            children,
            'data-testid': dataTest,
            ...rest
        }: DropdownProps,
        ref,
    ) => {
        const [isToggled, setIsToggledState] = useState(false);
        const [coords, setCoords] = useState<Coords>();
        const [clickPos, setClickPos] = useState<Coords>();

        const menuRef = useRef<HTMLUListElement>(null);
        const toggleRef = useRef<HTMLDivElement>(null);

        // when toggled, calculate the position of the menu
        // takes into account the toggle position, size and the menu alignment
        useLayoutEffect(() => {
            const { coordsToUse, toggleDimensions } = getPlacementData(
                toggleRef,
                menuRef,
                clickPos,
            );

            if (!coordsToUse || !menuRef.current) {
                return;
            }

            const { width, height } = menuRef.current.getBoundingClientRect();

            const adjustedCoords = getAdjustedCoords({
                coords: coordsToUse,
                alignMenu,
                menuDimensions: { width, height },
                toggleDimensions,
                offsetX,
                offsetY,
            });

            setCoords(adjustedCoords);
        }, [isToggled, clickPos, alignMenu, offsetX, offsetY]);

        useEffect(() => {
            if (!isToggled) {
                toggleRef.current?.blur();
            }

            // focus the menu when it's toggled and there is content, not items
            if (isToggled && content) {
                menuRef.current?.focus();
            }
        }, [isToggled, content]);

        const setToggled = (isToggled2: boolean) => {
            if (onToggle) onToggle(isToggled2);
            setIsToggledState(isToggled2);
        };

        useImperativeHandle(ref, () => ({
            close: () => {
                setToggled(false);
            },
        }));

        useOnClickOutside([menuRef, toggleRef], () => {
            if (isToggled) {
                setToggled(false);
            }
        });

        const onToggleClick = (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();

            if (isDisabled) {
                return;
            }

            // do not loose focus when clicking within the menu
            if (!content && document.activeElement === menuRef.current) {
                toggleRef.current?.focus();

                return;
            }

            setToggled(!isToggled);
            if (renderOnClickPosition) {
                setClickPos({ x: e.pageX, y: e.pageY });
            }
        };

        const hasCustomChildren = children !== undefined && children !== null;
        const childComponent = typeof children === 'function' ? children(isToggled) : children;

        const ToggleComponent = childComponent ? (
            cloneElement(childComponent, {
                isDisabled,
                onClick: (e: MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    childComponent?.props.onClick?.(e);
                },
            })
        ) : (
            <MoreIcon
                size="small"
                variant="tertiary"
                icon="dotsThree"
                tabIndex={-1}
                onClick={e => e.stopPropagation()}
                $isToggled={isToggled}
                isDisabled={isDisabled}
                data-testid={dataTest}
            />
        );

        const PortalMenu = createPortal(
            <Menu
                ref={menuRef}
                items={items}
                content={content}
                coords={coords}
                setToggled={setToggled}
                alignMenu={alignMenu}
                addon={addon}
            />,
            document.body,
        );

        const frameProps = pickAndPrepareFrameProps(rest, allowedDropdownFrameProps);

        return (
            <Container
                ref={toggleRef}
                className={className}
                tabIndex={renderOnClickPosition ? -1 : 0}
                $disabled={isDisabled}
                onClick={onToggleClick}
                onFocus={() => !isDisabled && !renderOnClickPosition && setToggled(true)}
                onBlur={e => !menuRef.current?.contains(e.relatedTarget) && setToggled(false)}
                $hasCustomChildren={hasCustomChildren}
                {...frameProps}
            >
                {ToggleComponent}
                {isToggled && PortalMenu}
            </Container>
        );
    },
);
