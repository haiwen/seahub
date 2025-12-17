import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { DropdownItem } from 'reactstrap';
import classNames from 'classnames';
import Icon from '../icon';

const DropdownMenuItem = ({
  menuItem,
  onClick,
  onKeyDown,
  onMouseMove,
  tickable = false,
  isSubMenuItem = false
}) => {
  const handleClick = useCallback((event) => {
    if (onClick) {
      onClick(event);
    }
  }, [onClick]);

  const handleKeyDown = useCallback((event) => {
    if (onKeyDown) {
      onKeyDown(event);
    }
  }, [onKeyDown]);

  return (
    <DropdownItem
      className={classNames({
        'position-relative pl-5': tickable && !isSubMenuItem
      })}
      data-toggle={menuItem.key}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseMove={isSubMenuItem ? undefined : onMouseMove}
    >
      {!isSubMenuItem && menuItem.tick && (
        <span className="dropdown-item-tick"><Icon symbol="tick" /></span>
      )}
      {menuItem.icon_dom || null}
      {isSubMenuItem ? <span>{menuItem.value}</span> : menuItem.value}
    </DropdownItem>
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
