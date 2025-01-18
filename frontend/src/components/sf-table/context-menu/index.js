import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

import './index.css';

const ContextMenu = ({
  createContextMenuOptions, getTableContentRect, getTableCanvasContainerRect, ...customProps
}) => {
  const menuRef = useRef(null);

  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const handleHide = useCallback((event) => {
    if (!menuRef.current && visible) {
      setVisible(false);
      return;
    }

    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setVisible(false);
    }
  }, [menuRef, visible]);

  const getMenuPosition = useCallback((x = 0, y = 0) => {
    let menuStyles = {
      top: y,
      left: x
    };
    if (!menuRef.current) return menuStyles;
    const rect = menuRef.current.getBoundingClientRect();
    const tableCanvasContainerRect = getTableCanvasContainerRect();
    const tableContentRect = getTableContentRect();
    const { right: innerWidth, bottom: innerHeight } = tableContentRect;
    menuStyles.top = menuStyles.top - tableCanvasContainerRect.top;
    menuStyles.left = menuStyles.left - tableCanvasContainerRect.left;

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
  }, [getTableContentRect, getTableCanvasContainerRect]);

  const handleShow = useCallback((event) => {
    event.preventDefault();
    if (menuRef.current && menuRef.current.contains(event.target)) return;

    setVisible(true);

    const position = getMenuPosition(event.clientX, event.clientY);
    setPosition(position);
  }, [getMenuPosition]);

  useEffect(() => {
    document.addEventListener('contextmenu', handleShow);

    return () => {
      document.removeEventListener('contextmenu', handleShow);
    };

  }, [handleShow]);

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

  const options = useMemo(() => {
    if (!visible || !createContextMenuOptions) return [];
    return createContextMenuOptions({ ...customProps, hideMenu: setVisible, menuPosition: position });
  }, [customProps, visible, createContextMenuOptions, position]);


  if (!Array.isArray(options) || options.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className='dropdown-menu sf-table-context-menu'
      style={position}
    >
      {options}
    </div>
  );
};

ContextMenu.propTypes = {
  createContextMenuOptions: PropTypes.func,
  getTableContentRect: PropTypes.func,
  getTableCanvasContainerRect: PropTypes.func,
};

export default ContextMenu;
