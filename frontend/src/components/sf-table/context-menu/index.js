import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import ModalPortal from '../../modal-portal';

import './index.css';

const ContextMenu = ({
  createContextMenuOptions, getTableContentRect, getTableCanvasContainerRect, ...customProps
}) => {
  const menuRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const options = useMemo(() => {
    if (!visible || !createContextMenuOptions) return [];
    return createContextMenuOptions({ ...customProps, hideMenu: setVisible, menuPosition: position });
  }, [customProps, visible, createContextMenuOptions, position]);

  const handleHide = useCallback((event) => {
    if (!menuRef.current || !menuRef.current.contains(event.target)) {
      setVisible(false);
    }
  }, []);

  const getMenuPosition = useCallback((x = 0, y = 0) => {
    if (!menuRef.current) {
      return { top: y, left: x };
    }

    let menuStyles = {
      top: y,
      left: x
    };

    const rect = menuRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - y;
    const spaceAbove = y;
    const spaceRight = window.innerWidth - x;
    const spaceLeft = x;

    // Check if menu fits in each direction
    const fitsBelow = spaceBelow >= rect.height;
    const fitsAbove = spaceAbove >= rect.height;
    const fitsLeft = spaceLeft >= rect.width;
    const fitsRight = spaceRight >= rect.width;

    if (fitsBelow) {
      menuStyles.top = y;
    } else if (fitsAbove) {
      menuStyles.top = y - rect.height;
    } else {
      // Neither fits vertically, choose the direction with more space
      if (spaceAbove > spaceBelow) {
        menuStyles.top = 0; // Top of screen
      } else {
        menuStyles.top = window.innerHeight - rect.height; // Bottom of screen
      }
    }

    if (fitsRight) {
      menuStyles.left = x;
    } else if (fitsLeft) {
      menuStyles.left = x - rect.width;
    } else {
      if (spaceLeft > spaceRight) {
        menuStyles.left = 0; // Left of screen
      } else {
        menuStyles.left = window.innerWidth - rect.width; // Right of screen
      }
    }

    // Final boundary check
    if (menuStyles.top < 0) {
      menuStyles.top = 0;
    }
    if (menuStyles.left < 0) {
      menuStyles.left = 0;
    }
    if (menuStyles.top + rect.height > window.innerHeight) {
      menuStyles.top = window.innerHeight - rect.height;
    }
    if (menuStyles.left + rect.width > window.innerWidth) {
      menuStyles.left = window.innerWidth - rect.width;
    }

    return menuStyles;
  }, []);

  const handleShow = useCallback((event) => {
    event.preventDefault();

    if (menuRef.current && menuRef.current.contains(event.target)) {
      return;
    }

    setVisible(true);

    setTimeout(() => {
      if (menuRef.current) {
        const position = getMenuPosition(event.clientX, event.clientY);
        setPosition(position);
      }
    }, 0);
  }, [getMenuPosition]);

  useEffect(() => {
    const metadataTagsWrapper = document.querySelector('.sf-metadata-tags-wrapper');
    metadataTagsWrapper && metadataTagsWrapper.addEventListener('contextmenu', handleShow);

    const historyWrapper = document.querySelector('.sf-history-wrapper');
    historyWrapper && historyWrapper.addEventListener('contextmenu', handleShow);

    const trashWrapper = document.querySelector('.sf-trash-wrapper');
    trashWrapper && trashWrapper.addEventListener('contextmenu', handleShow);

    const dirTableWrapper = document.querySelector('.dir-table-wrapper');
    dirTableWrapper && dirTableWrapper.addEventListener('contextmenu', handleShow);

    return () => {
      const metadataTagsWrapper = document.querySelector('.sf-metadata-tags-wrapper');
      metadataTagsWrapper && metadataTagsWrapper.removeEventListener('contextmenu', handleShow);

      const historyWrapper = document.querySelector('.sf-history-wrapper');
      historyWrapper && historyWrapper.removeEventListener('contextmenu', handleShow);

      const trashWrapper = document.querySelector('.sf-trash-wrapper');
      trashWrapper && trashWrapper.removeEventListener('contextmenu', handleShow);

      const dirTableWrapper = document.querySelector('.dir-table-wrapper');
      dirTableWrapper && dirTableWrapper.removeEventListener('contextmenu', handleShow);
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

  if (!Array.isArray(options) || options.length === 0) return null;

  return (
    <ModalPortal>
      <div
        ref={menuRef}
        className='dropdown-menu sf-table-context-menu'
        style={position}
      >
        {options}
      </div>
    </ModalPortal>
  );
};

ContextMenu.propTypes = {
  createContextMenuOptions: PropTypes.func,
  getTableContentRect: PropTypes.func,
  getTableCanvasContainerRect: PropTypes.func,
};

export default ContextMenu;
