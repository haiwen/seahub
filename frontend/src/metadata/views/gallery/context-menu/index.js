import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';
import './index.css';

const OPERATION = {
  DOWNLOAD: 'download',
  DELETE: 'delete',
};

const ContextMenu = ({ getContentRect, getContainerRect, onDownload, onDelete }) => {
  const menuRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const options = useMemo(() => {
    if (!visible) return [];
    return [
      { value: OPERATION.DOWNLOAD, label: gettext('Download') },
      { value: OPERATION.DELETE, label: gettext('Delete') }
    ];
  }, [visible]);

  const handleHide = useCallback((event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setVisible(false);
    }
  }, [menuRef]);

  const handleOptionClick = useCallback((event, option) => {
    event.stopPropagation();
    switch (option.value) {
      case OPERATION.DOWNLOAD: {
        onDownload && onDownload();
        break;
      }
      case OPERATION.DELETE: {
        onDelete && onDelete();
        break;
      }
      default: {
        break;
      }
    }
    setVisible(false);
  }, [onDownload, onDelete]);

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

  useEffect(() => {
    const handleShow = (event) => {
      event.preventDefault();
      if (menuRef.current && menuRef.current.contains(event.target)) return;

      if (event.target.tagName.toLowerCase() !== 'img') {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  if (options.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className='dropdown-menu sf-metadata-contextmenu'
      style={position}
    >
      {options.map((option, index) => (
        <button
          key={index}
          className='dropdown-item sf-metadata-contextmenu-item'
          onClick={(event) => handleOptionClick(event, option)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

ContextMenu.propTypes = {
  getContentRect: PropTypes.func.isRequired,
  getContainerRect: PropTypes.func.isRequired,
  onDownload: PropTypes.func,
  onDelete: PropTypes.func,
};

export default ContextMenu;
