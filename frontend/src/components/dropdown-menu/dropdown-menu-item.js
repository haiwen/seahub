import React from 'react';
import PropTypes from 'prop-types';
import CustomDropdownItem from '../dropdown/custom-dropdown-item';

const DropdownMenuItem = ({ menuItem, onClick, onKeyDown, onMouseMove, tickable = false, isSubMenuItem = false }) => {
  return (
    <CustomDropdownItem
      item={{
        ...menuItem,
        label: menuItem.value,
        icon: menuItem.icon_dom,
        checked: !isSubMenuItem && tickable && menuItem.tick,
      }}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onMouseMove={isSubMenuItem ? undefined : onMouseMove}
      showCheckPlaceholder={tickable && !isSubMenuItem}
      showShortcutPlaceholder={false}
      tabIndex={-1}
      tag="div"
    />
  );
};

DropdownMenuItem.propTypes = {
  menuItem: PropTypes.object.isRequired,
  onClick: PropTypes.func,
  onKeyDown: PropTypes.func,
  onMouseMove: PropTypes.func,
  tickable: PropTypes.bool,
  isSubMenuItem: PropTypes.bool,
};

export default DropdownMenuItem;
