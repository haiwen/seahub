import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Dropdown, DropdownMenu, DropdownToggle } from 'reactstrap';
import { gettext } from '@/utils/constants';
import ModalPortal from '../modal-portal';
import Icon from '../icon';
import Tooltip from '../tooltip';
import { CustomDropdownMenuContent } from './menu-content';
import {
  focusMenuItem,
  MENU_ITEM_SELECTORS,
  getDirectionByPlacement,
  DROPDOWN_MENU_OFFSET_DEFAULT,
} from './utils';

import './index.css';

const ADAPTIVE_MENU_MARGIN = 8;

const clamp = (value, min, max) => {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
};

const getAdaptivePosition = (toggleElement, menuElement) => {
  if (!toggleElement || !menuElement || typeof window === 'undefined') {
    return null;
  }

  const toggleRect = toggleElement.getBoundingClientRect();
  const menuRect = menuElement.getBoundingClientRect();
  const menuWidth = menuRect.width;
  const menuHeight = menuRect.height;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = ADAPTIVE_MENU_MARGIN;
  const gap = DROPDOWN_MENU_OFFSET_DEFAULT.options.offset[1];

  const spaceBelow = viewportHeight - toggleRect.bottom - margin;
  const spaceAbove = toggleRect.top - margin;
  const spaceRight = viewportWidth - toggleRect.right - margin;
  const spaceLeft = toggleRect.left - margin;

  if (spaceBelow >= menuHeight) {
    return { placement: 'down', offset: [0, gap] };
  }

  if (spaceAbove >= menuHeight) {
    return { placement: 'top', offset: [0, gap] };
  }

  const minTop = margin;
  const maxTop = viewportHeight - menuHeight - margin;
  const sideTop = clamp(toggleRect.top, minTop, maxTop);
  const sideSkidding = sideTop - toggleRect.top;

  if (spaceRight >= menuWidth) {
    return { placement: 'end', offset: [sideSkidding, gap] };
  }

  if (spaceLeft >= menuWidth) {
    return { placement: 'start', offset: [sideSkidding, gap] };
  }

  if (Math.max(spaceRight, spaceLeft) > 0) {
    return {
      placement: spaceRight >= spaceLeft ? 'end' : 'start',
      offset: [sideSkidding, gap],
    };
  }

  const useDown = spaceBelow >= spaceAbove;
  const fallbackTop = clamp(
    useDown ? toggleRect.bottom + gap : toggleRect.top - menuHeight - gap,
    minTop,
    maxTop,
  );

  if (useDown) {
    return { placement: 'down', offset: [0, fallbackTop - toggleRect.bottom] };
  }

  return { placement: 'top', offset: [0, toggleRect.top - menuHeight - fallbackTop] };
};

export const CustomDropdown = ({
  target,
  forwardedRef,
  variant = 'action',
  placement = 'down',
  adaptivePlacement = false,
  modifiers,
  trigger,
  triggerClassName,
  menuClassName,
  className,
  items,
  menuPortal = true,
  freezeItem,
  unfreezeItem,
  toggleProps,
  dropdownProps,
  onMenuHide,
  onToggle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [adaptivePosition, setAdaptivePosition] = useState(null);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const menuContainerRef = useRef(null);
  const generatedId = useId().replace(/:/g, '');
  const menuId = target || `dropdown-${generatedId}`;
  const effectivePlacement = adaptivePlacement ? (adaptivePosition?.placement || placement) : placement;

  const getMenuElement = useCallback(() => {
    if (menuRef.current instanceof HTMLElement && menuRef.current.isConnected) {
      return menuRef.current;
    }

    const menuElement = menuContainerRef.current?.querySelector('.dropdown-menu');
    if (menuElement) {
      menuRef.current = menuElement;
      return menuElement;
    }

    return null;
  }, []);

  const updateAdaptivePosition = useCallback(() => {
    if (!adaptivePlacement || !isOpen) return;

    const nextPosition = getAdaptivePosition(dropdownRef.current, getMenuElement());
    if (!nextPosition) return;

    setAdaptivePosition((previousPosition) => {
      if (
        previousPosition?.placement === nextPosition.placement &&
        previousPosition?.offset[0] === nextPosition.offset[0] &&
        previousPosition?.offset[1] === nextPosition.offset[1]
      ) {
        return previousPosition;
      }
      return nextPosition;
    });
  }, [adaptivePlacement, getMenuElement, isOpen]);

  useLayoutEffect(() => {
    if (!adaptivePlacement || !isOpen) return undefined;

    const frame = window.requestAnimationFrame(updateAdaptivePosition);
    return () => window.cancelAnimationFrame(frame);
  }, [adaptivePlacement, isOpen, items, updateAdaptivePosition]);

  useEffect(() => {
    if (!adaptivePlacement || !isOpen) return undefined;

    window.addEventListener('resize', updateAdaptivePosition);
    return () => window.removeEventListener('resize', updateAdaptivePosition);
  }, [adaptivePlacement, isOpen, updateAdaptivePosition]);

  const dropdownMenuModifiers = useMemo(() => {
    if (!adaptivePlacement) {
      return modifiers || [{
        name: 'preventOverflow',
        options: { boundary: document.body }
      }, DROPDOWN_MENU_OFFSET_DEFAULT];
    }

    const adaptiveOffset = adaptivePosition?.offset || DROPDOWN_MENU_OFFSET_DEFAULT.options.offset;
    return [
      {
        name: 'preventOverflow',
        options: { boundary: document.body },
      },
      {
        name: 'offset',
        options: { offset: adaptiveOffset },
      },
    ];
  }, [adaptivePlacement, adaptivePosition, modifiers]);

  useEffect(() => {
    if (forwardedRef) {
      forwardedRef.current = { dropdownRef, menuRef };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = (nextOpen) => {
    setIsOpen(nextOpen);
    if (nextOpen) {
      freezeItem?.();
    } else {
      setAdaptivePosition(null);
      menuRef.current = null;
      unfreezeItem?.();
      onMenuHide?.();
    }
  };

  const toggle = (e) => {
    e.stopPropagation();
    handleToggle(!isOpen);
    onToggle?.(!isOpen);
  };

  const onItemClick = (e, item) => {
    if (item.disabled) {
      return;
    }

    item.onClick?.(e, item);
    if (!item.keepOpen) {
      handleToggle(false);
    }
  };

  const onToggleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        handleToggle(true);
      } else {
        focusMenuItem(getMenuElement(), MENU_ITEM_SELECTORS);
      }
    }
  };

  const onMenuKeyDown = (event) => {
    const selectors = MENU_ITEM_SELECTORS;
    const menuElement = getMenuElement();
    const interactiveItems = menuElement ? Array.from(menuElement.querySelectorAll(selectors)) : [];
    const currentIndex = interactiveItems.findIndex((node) => node === document.activeElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      handleToggle(false);
      dropdownRef.current?.focus();
      return;
    }

    if (event.key === 'ArrowDown' && interactiveItems.length > 0) {
      event.preventDefault();
      const nextIndex = currentIndex < interactiveItems.length - 1 ? currentIndex + 1 : 0;
      interactiveItems[nextIndex]?.focus();
      return;
    }

    if (event.key === 'ArrowUp' && interactiveItems.length > 0) {
      event.preventDefault();
      const nextIndex = currentIndex > 0 ? currentIndex - 1 : interactiveItems.length - 1;
      interactiveItems[nextIndex]?.focus();
    }
  };

  const menuContent = (
    <DropdownMenu
      className={menuClassName}
      modifiers={dropdownMenuModifiers}
      flip={!adaptivePlacement}
      onKeyDown={onMenuKeyDown}
      role="menu"
    >
      <CustomDropdownMenuContent
        items={items}
        variant={variant}
        menuClassName={menuClassName}
        onItemClick={onItemClick}
      />
    </DropdownMenu>
  );
  const renderedMenuContent = adaptivePlacement ? (
    <div ref={menuContainerRef}>{menuContent}</div>
  ) : menuContent;

  if (!items?.length) {
    return null;
  }

  return (
    <Dropdown
      {...dropdownProps}
      isOpen={isOpen}
      toggle={toggle}
      direction={getDirectionByPlacement(effectivePlacement)}
      className={className}
    >
      <DropdownToggle
        id={menuId}
        innerRef={dropdownRef}
        tag="span"
        role="button"
        tabIndex={toggleProps?.disabled ? -1 : 0}
        className={classNames('more-dropdown-toggle', triggerClassName)}
        aria-label={gettext('More operations')}
        aria-expanded={isOpen}
        data-toggle="dropdown"
        onKeyDown={onToggleKeyDown}
        {...toggleProps}
      >
        {typeof trigger === 'function' ? trigger(isOpen) : trigger || (
          <>
            <Icon symbol="more-level" />
            {!isOpen && <Tooltip target={menuId}>{gettext('More operations')}</Tooltip>}
          </>
        )}
      </DropdownToggle>
      {menuPortal ? <ModalPortal>{renderedMenuContent}</ModalPortal> : renderedMenuContent}
    </Dropdown>
  );
};

CustomDropdown.propTypes = {
  target: PropTypes.string,
  trigger: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  triggerClassName: PropTypes.string,
  menuClassName: PropTypes.string,
  items: PropTypes.array,
  variant: PropTypes.oneOf(['action', 'control']),
  placement: PropTypes.string,
  adaptivePlacement: PropTypes.bool,
  modifiers: PropTypes.array,
  menuPortal: PropTypes.bool,
  freezeItem: PropTypes.func,
  unfreezeItem: PropTypes.func,
  className: PropTypes.string,
  toggleProps: PropTypes.object,
  dropdownProps: PropTypes.object,
  onMenuHide: PropTypes.func,
  forwardedRef: PropTypes.object,
  onToggle: PropTypes.func,
};

export default CustomDropdown;
