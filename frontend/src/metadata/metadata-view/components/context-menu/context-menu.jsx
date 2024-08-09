import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './context-menu.css';

const ContextMenu = ({ options, onOptionClick }) => {
  const menuRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const handleHide = useCallback((event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setVisible(false);
    }
  }, [menuRef]);

  const handleOptionClick = (event, option) => {
    onOptionClick(event, option);
    setVisible(false);
  };

  const getMenuPosition = (x = 0, y = 0) => {
    let menuStyles = {
      top: y,
      left: x
    };
    if (!menuRef.current) return menuStyles;

    const { innerWidth, innerHeight } = window;
    const rect = menuRef.current.getBoundingClientRect();

    // Calculate the offset of the parent components
    const parentRect = menuRef.current.parentElement.getBoundingClientRect();
    const offsetX = parentRect.left;
    const offsetY = parentRect.top;

    // Adjust the position based on the offset
    menuStyles.top = y - offsetY;
    menuStyles.left = x - offsetX;

    const metadataResultFooterHeight = 32;
    const contentHeight = innerHeight - metadataResultFooterHeight;
    if (y + rect.height > contentHeight) {
      menuStyles.top -= rect.height;
    }
    if (x + rect.width > innerWidth) {
      menuStyles.left -= rect.width;
    }
    if (menuStyles.top < 0) {
      menuStyles.top = rect.height < contentHeight ? (contentHeight - rect.height) / 2 : 0;
    }
    if (menuStyles.left < 0) {
      menuStyles.left = rect.width < innerWidth ? (innerWidth - rect.width) / 2 : 0;
    }
    return menuStyles;
  };

  useEffect(() => {
    const handleShow = (event) => {
      event.preventDefault();
      if (menuRef.current && menuRef.current.contains(event.target)) return;

      setVisible(true);

      const position = getMenuPosition(event.clientX, event.clientY);
      setPosition(position);
    };

    document.addEventListener('contextmenu', handleShow);

    return () => {
      document.removeEventListener('contextmenu', handleShow);
    };
  }, []);

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

  return (
    <ul
      ref={menuRef}
      className='sf-metadata context-menu'
      style={position}
    >
      {options.map((option, index) => (
        <li
          key={index}
          className='sf-metadata dropdown-item'
          onClick={(event) => handleOptionClick(event, option)}
        >
          {option.label}
        </li>
      ))}
    </ul>
  );
};

ContextMenu.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  onOptionClick: PropTypes.func.isRequired,
};

export default ContextMenu;
