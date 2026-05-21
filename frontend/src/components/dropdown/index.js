import React, { useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Dropdown, DropdownMenu, DropdownToggle } from 'reactstrap';
import { gettext } from '@/utils/constants';
import ModalPortal from '../modal-portal';
import Icon from '../icon';
import Tooltip from '../tooltip';
import { CustomDropdownMenuContent } from './menu-content';
import {
  DEFAULT_MENU_OFFSET_DISTANCE,
  DEFAULT_MENU_OFFSET_SKIDDING,
  focusMenuItem,
  MENU_ITEM_SELECTORS,
  getDirectionByPlacement,
} from './utils';

import './index.css';

export const CustomDropdown = ({
  target,
  forwardedRef,
  variant = 'action',
  placement = 'down',
  modifier,
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
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const generatedId = useId().replace(/:/g, '');
  const menuId = target || `dropdown-${generatedId}`;

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
      unfreezeItem?.();
      onMenuHide?.();
    }
  };

  const toggle = () => {
    handleToggle(!isOpen);
    onToggle?.(!isOpen);
  };

  const onItemClick = (e, item) => {
    if (item.disabled) {
      return;
    }

    item.onClick?.(e, item);
  };

  const onToggleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        handleToggle(true);
      } else {
        focusMenuItem(menuRef.current, MENU_ITEM_SELECTORS);
      }
    }
  };

  const onMenuKeyDown = (event) => {
    const selectors = MENU_ITEM_SELECTORS;
    const interactiveItems = menuRef.current ? Array.from(menuRef.current.querySelectorAll(selectors)) : [];
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
      ref={menuRef}
      className={menuClassName}
      modifiers={modifier || [{
        name: 'preventOverflow',
        options: { boundary: document.body }
      }, {
        name: 'offset',
        options: { offset: [DEFAULT_MENU_OFFSET_SKIDDING, DEFAULT_MENU_OFFSET_DISTANCE] },
      }]}
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

  if (!items?.length) {
    return null;
  }

  return (
    <Dropdown
      {...dropdownProps}
      isOpen={isOpen}
      toggle={toggle}
      direction={getDirectionByPlacement(placement)}
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
        {trigger || (
          <>
            <Icon symbol="more-level" />
            <Tooltip target={menuId}>{gettext('More operations')}</Tooltip>
          </>
        )}
      </DropdownToggle>
      {menuPortal ? <ModalPortal>{menuContent}</ModalPortal> : menuContent}
    </Dropdown>
  );
};

CustomDropdown.propTypes = {
  target: PropTypes.string,
  trigger: PropTypes.node,
  triggerClassName: PropTypes.string,
  menuClassName: PropTypes.string,
  items: PropTypes.array,
  variant: PropTypes.oneOf(['action', 'control']),
  placement: PropTypes.string,
  modifier: PropTypes.array,
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
