import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './context-menu.css';

const ContextMenu = ({ position, options, onOptionClick, visible, onCloseContextMenu }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleCloseContextMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onCloseContextMenu();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleCloseContextMenu);
    }

    return () => {
      document.removeEventListener('mousedown', handleCloseContextMenu);
    };
  }, [visible, onCloseContextMenu]);

  if (!visible) return null;

  return (
    <ul
      ref={menuRef}
      className='context-menu'
      style={{
        top: position.y,
        left: position.x,
      }}
    >
      {options.map((option, index) => (
        <li
          key={index}
          className='context-menu-item'
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
