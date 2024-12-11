import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './index.css';

const ContextMenu = ({ options, getContainerRect, getContentRect, onOptionClick, validTargets }) => {
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
    const containerRect = getContainerRect();
    const { right: innerWidth, bottom: innerHeight } = getContentRect();
    menuStyles.top = menuStyles.top - containerRect.top;
    menuStyles.left = menuStyles.left - containerRect.left;

    if (y + rect.height > innerHeight - 10) {
      menuStyles.top -= rect.height;
    }
    if (x + rect.width > innerWidth) {
      menuStyles.left -= rect.width;
    }
    if (menuStyles.top < 0) {
      menuStyles.top = rect.bottom > innerHeight ? (innerHeight - 10 - rect.height) / 2 : 0;
    }
    if (menuStyles.left < 0) {
      menuStyles.left = rect.width < innerWidth ? (innerWidth - rect.width) / 2 : 0;
    }
    return menuStyles;
  }, [getContentRect, getContainerRect]);

  const handleOptionClick = useCallback((event, option) => {
    event.stopPropagation();
    onOptionClick(option);
    setVisible(false);
  }, [onOptionClick]);

  useEffect(() => {
    const handleShow = (event) => {
      event.preventDefault();
      if (menuRef.current && menuRef.current.contains(event.target)) return;

      if (validTargets && !validTargets.some(target => event.target.closest(target))) {
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
  }, [getMenuPosition, validTargets]);

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
      {options.map((option, index) => (
        <button
          key={index}
          className="dropdown-item sf-metadata-contextmenu-item"
          onClick={(e) => handleOptionClick(e, option)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

ContextMenu.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  })).isRequired,
  getContainerRect: PropTypes.func.isRequired,
  getContentRect: PropTypes.func.isRequired,
  onOptionClick: PropTypes.func.isRequired,
  validTargets: PropTypes.array,
};

export default ContextMenu;
