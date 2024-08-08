import React, { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './context-menu.css';

const ContextMenu = ({ position, options, onOptionClick, visible, onCloseContextMenu }) => {
  const menuRef = useRef(null);

  const handleCloseContextMenu = useCallback((event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      onCloseContextMenu();
    }
  }, [menuRef, onCloseContextMenu]);

  useEffect(() => {
    const handleContextMenu = (event) => {
      event.preventDefault();
    };

    if (visible) {
      document.addEventListener('mousedown', handleCloseContextMenu);
      if (menuRef.current) {
        menuRef.current.addEventListener('contextmenu', handleContextMenu);
      }
    } else {
      if (menuRef.current) {
        menuRef.current.removeEventListener('contextmenu', handleContextMenu);
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleCloseContextMenu);
    };
  }, [visible, handleCloseContextMenu]);

  if (!visible) return null;

  return (
    <ul
      ref={menuRef}
      className='sf-metadata context-menu'
      style={{
        top: position.y,
        left: position.x,
      }}
    >
      {options.map((option, index) => (
        <li
          key={index}
          className='sf-metadata dropdown-item'
          onClick={(event) => onOptionClick(event, option)}
        >
          {option.label}
        </li>
      ))}
    </ul>
  );
};

ContextMenu.propTypes = {
  position: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  onOptionClick: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
};

export default ContextMenu;
