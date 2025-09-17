import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { DropdownItem } from 'reactstrap';

const ContextMenuItem = ({
  option,
  onClick,
  onMouseMove,
  children,
  isSubMenuItem = false
}) => {
  const handleClick = useCallback((event) => {
    event.stopPropagation();
    onClick && onClick(event, option);
  }, [onClick, option]);

  const handleMouseMove = useCallback((event) => {
    if (onMouseMove) {
      onMouseMove(event);
    }
  }, [onMouseMove]);

  if (option.subOpList && !isSubMenuItem) {
    return children;
  }

  if (isSubMenuItem) {
    return (
      <DropdownItem onClick={handleClick}>
        {option.value}
      </DropdownItem>
    );
  }

  return (
    <button
      className="dropdown-item"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
    >
      {option.value}
    </button>
  );
};

ContextMenuItem.propTypes = {
  option: PropTypes.object.isRequired,
  onClick: PropTypes.func,
  onMouseMove: PropTypes.func,
  children: PropTypes.node,
  isSubMenuItem: PropTypes.bool,
};

export default ContextMenuItem;
