import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DropdownItem } from 'reactstrap';
import PropTypes from 'prop-types';

import './index.css';

const ContextMenu = ({
  options,
  boundaryCoordinates = { top: 0, right: window.innerWidth, bottom: window.innerHeight, left: 0 },
  onOptionClick,
  ignoredTriggerElements
}) => {
  const menuRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const handleHide = useCallback((event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setVisible(false);
    }
  }, [menuRef]);

  const getMenuPosition = useCallback((x = 0, y = 0) => {
    let menuStyles = {
      top: y,
      left: x
    };
    if (!menuRef.current) return menuStyles;
    const rect = menuRef.current.getBoundingClientRect();
    const { top: boundaryTop, right: boundaryRight, bottom: boundaryBottom, left: boundaryLeft } = boundaryCoordinates || {};
    menuStyles.top = menuStyles.top - boundaryTop;
    menuStyles.left = menuStyles.left - boundaryLeft;

    if (y + rect.height > boundaryBottom - 10) {
      menuStyles.top -= rect.height;
    }
    if (x + rect.width > boundaryRight) {
      menuStyles.left -= rect.width;
    }
    if (menuStyles.top < 0) {
      menuStyles.top = rect.bottom > boundaryBottom ? (boundaryBottom - 10 - rect.height) / 2 : 0;
    }
    if (menuStyles.left < 0) {
      menuStyles.left = rect.width < boundaryRight ? (boundaryRight - rect.width) / 2 : 0;
    }
    return menuStyles;
  }, [boundaryCoordinates]);

  const handleOptionClick = useCallback((event, option) => {
    event.stopPropagation();
    onOptionClick(option, event);
    setVisible(false);
  }, [onOptionClick]);

  useEffect(() => {
    const handleShow = (event) => {
      event.preventDefault();
      if (menuRef.current && menuRef.current.contains(event.target)) return;

      if (ignoredTriggerElements && !ignoredTriggerElements.some(target => event.target.closest(target))) {
        return;
      }

      setVisible(true);
      const position = getMenuPosition(event.clientX, event.clientY);
      setPosition(position);
    };

    document.addEventListener('contextmenu', handleShow);

    return () => {
      document.removeEventListener('contextmenu', handleShow);
    };
  }, [getMenuPosition, ignoredTriggerElements]);

  useEffect(() => {
    if (visible) {
      document.addEventListener('mousedown', handleHide);
    } else {
      document.removeEventListener('mousedown', handleHide);
    }

    return () => {
      document.removeEventListener('mousedown', handleHide);
    };
  }, [visible, handleHide]);

  if (!visible) return null;
  if (options.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="dropdown-menu sf-metadata-contextmenu"
      style={position}
    >
      {options.map((option, index) => {
        if (option === 'Divider') {
          return <DropdownItem key="divider-item" divider />;
        } else {
          return (
            <button
              key={index}
              className="dropdown-item sf-metadata-contextmenu-item"
              onClick={(event) => handleOptionClick(event, option)}
            >
              {option.label}
            </button>
          );
        }
      })}
    </div>
  );
};

ContextMenu.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  })).isRequired,
  boundaryCoordinates: PropTypes.object,
  ignoredTriggerElements: PropTypes.array,
  onOptionClick: PropTypes.func.isRequired,
};

export default ContextMenu;
