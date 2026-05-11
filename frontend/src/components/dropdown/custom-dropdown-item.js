import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { DropdownItem } from 'reactstrap';
import Icon from '../icon';
import { renderNodeContent } from './utils';

export const CustomDropdownItem = ({
  item,
  onClick,
  onKeyDown,
  onMouseMove,
  className,
  showCheckPlaceholder = false,
  showShortcutPlaceholder = false,
  isSubmenuTrigger = false,
  rightSlot,
  tabIndex = -1,
  tag,
}) => {
  const checked = Boolean(item.checked);
  const shortcut = item.shortcut;
  const icon = item.icon;
  const label = renderNodeContent(item.label);
  const showLeftSlot = checked || showCheckPlaceholder;
  const showRightSlot = Boolean(rightSlot) || (showShortcutPlaceholder && shortcut);

  return (
    <DropdownItem
      tag={tag}
      data-dropdown-item={!isSubmenuTrigger ? 'true' : undefined}
      data-dropdown-submenu-trigger={isSubmenuTrigger ? 'true' : undefined}
      className={classNames(className, item.className, {
        'is-danger': item.danger,
        'is-checked': checked,
        'is-disabled': item.disabled,
      })}
      onClick={item.disabled ? undefined : onClick}
      onKeyDown={onKeyDown}
      onMouseMove={onMouseMove}
      disabled={item.disabled}
      toggle={false}
      role="menuitem"
      tabIndex={tabIndex}
      aria-disabled={item.disabled ? 'true' : undefined}
    >
      {showLeftSlot && (
        <span className="dropdown-item-left-slot" aria-hidden="true">
          {checked && <Icon symbol="check-thin" />}
        </span>
      )}
      <span className="dropdown-item-main-slot">
        {icon && <span className="dropdown-item-icon mr-2">{renderNodeContent(icon)}</span>}
        <span className="dropdown-item-label" title={label}>{label}</span>
      </span>
      {showRightSlot && (
        <span className="dropdown-item-right-slot" aria-hidden="true">
          {rightSlot || (showShortcutPlaceholder && shortcut ? <span className="dropdown-item-shortcut mr-3">{shortcut}</span> : null)}
        </span>
      )}
    </DropdownItem>
  );
};

CustomDropdownItem.propTypes = {
  item: PropTypes.object.isRequired,
  onClick: PropTypes.func,
  onKeyDown: PropTypes.func,
  onMouseMove: PropTypes.func,
  className: PropTypes.string,
  showCheckPlaceholder: PropTypes.bool,
  showShortcutPlaceholder: PropTypes.bool,
  isSubmenuTrigger: PropTypes.bool,
  rightSlot: PropTypes.node,
  tabIndex: PropTypes.number,
  tag: PropTypes.oneOfType([PropTypes.string, PropTypes.elementType]),
};

export default CustomDropdownItem;
