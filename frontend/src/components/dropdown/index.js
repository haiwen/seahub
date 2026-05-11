import React, { useId, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Dropdown, DropdownMenu, DropdownToggle } from 'reactstrap';
import ModalPortal from '../modal-portal';
import Icon from '../icon';
import Tooltip from '../tooltip';
import { CustomDropdownMenuContent } from './menu-content';
import {
  DEFAULT_MENU_OFFSET_DISTANCE,
  DEFAULT_MENU_OFFSET_SKIDDING,
  focusMenuItem,
  getDirectionByPlacement,
  getMenuItemSelectors,
  normalizeDropdownItems,
} from './utils';

import './index.css';

export const CustomDropdown = ({
  target,
  trigger,
  tooltip,
  triggerClassName,
  menuClassName,
  items,
  getItems,
  item,
  onItemClick,
  variant = 'action',
  placement = 'bottom-start',
  modifier,
  menuPortal = true,
  freezeItem,
  unfreezeItem,
  className,
  normalizeOptions,
  dropdownProps,
  toggleProps,
  onMenuHide,
  forwardedRef,
  onToggle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const generatedId = useId().replace(/:/g, '');
  const menuId = target || `dropdown-${generatedId}`;
  const normalizedItems = useMemo(() => normalizeDropdownItems(
    typeof getItems === 'function' ? getItems(item) : items,
    normalizeOptions,
  ), [getItems, item, items, normalizeOptions]);

  const handleToggle = (nextOpen) => {
    setIsOpen(nextOpen);
    if (nextOpen) {
      freezeItem?.();
    } else {
      unfreezeItem?.();
      onMenuHide?.();
    }
  };

  const toggle = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    onToggle?.(event);
    handleToggle(!isOpen);
  };

  const closeMenu = () => handleToggle(false);

  const onMenuItemSelect = (selectedItem, event) => {
    if (selectedItem.disabled) {
      return;
    }

    selectedItem.onClick?.(event, selectedItem);
    onItemClick?.(selectedItem, event, item);

    if (!selectedItem.keepOpen) {
      closeMenu();
    }
  };

  const onToggleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle(event);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        handleToggle(true);
      } else {
        focusMenuItem(menuRef.current, getMenuItemSelectors());
      }
    }
  };

  const onMenuKeyDown = (event) => {
    const selectors = getMenuItemSelectors();
    const interactiveItems = menuRef.current ? Array.from(menuRef.current.querySelectorAll(selectors)) : [];
    const currentIndex = interactiveItems.findIndex((node) => node === document.activeElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
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
      ref={menuRef}
      className={classNames('dropdown-menu', menuClassName)}
      modifiers={modifier || [{
        name: 'preventOverflow',
        options: { boundary: document.body }
      }, {
        name: 'offset',
        options: { offset: [DEFAULT_MENU_OFFSET_SKIDDING, DEFAULT_MENU_OFFSET_DISTANCE] },
      }]}
      onKeyDown={onMenuKeyDown}
      data-placement={placement}
      role="menu"
    >
      <CustomDropdownMenuContent
        items={normalizedItems}
        variant={variant}
        menuClassName={menuClassName}
        menuRef={menuRef}
        onItemClick={onMenuItemSelect}
      />
    </DropdownMenu>
  );

  if (!normalizedItems.length) {
    return null;
  }

  return (
    <Dropdown
      {...dropdownProps}
      isOpen={isOpen}
      toggle={toggle}
      direction={getDirectionByPlacement(placement)}
      className={classNames(className, dropdownProps?.className)}
    >
      <DropdownToggle
        {...toggleProps}
        id={menuId}
        innerRef={dropdownRef}
        tag={toggleProps?.tag || 'span'}
        role={toggleProps?.tag === 'button' ? undefined : 'button'}
        tabIndex={toggleProps?.disabled ? -1 : 0}
        className={classNames('more-dropdown-toggle', triggerClassName, toggleProps?.className)}
        aria-expanded={isOpen}
        data-toggle="dropdown"
        onClick={toggle}
        onKeyDown={onToggleKeyDown}
      >
        {trigger || <Icon symbol="more-level" />}
        {tooltip && <Tooltip target={menuId}>{tooltip}</Tooltip>}
      </DropdownToggle>
      {forwardedRef && (forwardedRef.current = { dropdownRef, menuRef })}
      {menuPortal ? <ModalPortal>{menuContent}</ModalPortal> : menuContent}
    </Dropdown>
  );
};

CustomDropdown.propTypes = {
  target: PropTypes.string,
  trigger: PropTypes.node,
  tooltip: PropTypes.string,
  triggerClassName: PropTypes.string,
  menuClassName: PropTypes.string,
  items: PropTypes.array,
  getItems: PropTypes.func,
  item: PropTypes.object,
  onItemClick: PropTypes.func,
  variant: PropTypes.oneOf(['action', 'control']),
  placement: PropTypes.string,
  modifier: PropTypes.array,
  menuPortal: PropTypes.bool,
  freezeItem: PropTypes.func,
  unfreezeItem: PropTypes.func,
  className: PropTypes.string,
  normalizeOptions: PropTypes.object,
  dropdownProps: PropTypes.object,
  toggleProps: PropTypes.object,
  onMenuHide: PropTypes.func,
  forwardedRef: PropTypes.object,
  onToggle: PropTypes.func,
};

export default CustomDropdown;
