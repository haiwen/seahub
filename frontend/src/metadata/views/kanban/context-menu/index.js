import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';
import './index.css';

const OPERATION = {
  OPEN_IN_NEW_TAB: 'open-in-new-tab',
  OPEN_PARENT_FOLDER: 'open-parent-folder',
  DOWNLOAD: 'download',
  DELETE: 'delete',
  RENAME: 'rename',
};

const ContextMenu = ({ isDir, getContainerRect, onOpenInNewTab, onOpenParentFolder, onDownload, onDelete, onRename }) => {
  const menuRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const options = useMemo(() => {
    if (!visible) return [];
    return [
      { value: OPERATION.OPEN_IN_NEW_TAB, label: isDir ? gettext('Open folder in new tab') : gettext('Open file in new tab') },
      { value: OPERATION.OPEN_PARENT_FOLDER, label: gettext('Open parent folder') },
      { value: OPERATION.DOWNLOAD, label: gettext('Download') },
      { value: OPERATION.DELETE, label: gettext('Delete') },
      { value: OPERATION.RENAME, label: gettext('Rename') },
    ];
  }, [visible, isDir]);

  const handleHide = useCallback((event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setVisible(false);
    }
  }, [menuRef]);

  const handleOptionClick = useCallback((event, option) => {
    event.stopPropagation();
    switch (option.value) {
      case OPERATION.OPEN_IN_NEW_TAB: {
        onOpenInNewTab && onOpenInNewTab();
        break;
      }
      case OPERATION.OPEN_PARENT_FOLDER: {
        onOpenParentFolder && onOpenParentFolder();
        break;
      }
      case OPERATION.DOWNLOAD: {
        onDownload && onDownload();
        break;
      }
      case OPERATION.DELETE: {
        onDelete && onDelete();
        break;
      }
      case OPERATION.RENAME: {
        onRename && onRename();
        break;
      }
      default: {
        break;
      }
    }
    setVisible(false);
  }, [onDownload, onDelete, onRename]);

  const getMenuPosition = useCallback((x = 0, y = 0) => {
    let menuStyles = {
      top: y,
      left: x
    };
    if (!menuRef.current) return menuStyles;
    const rect = menuRef.current.getBoundingClientRect();
    const { right: innerWidth, bottom: innerHeight } = getContainerRect();

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
  }, [getContainerRect]);

  useEffect(() => {
    const handleShow = (event) => {
      event.preventDefault();

      if (menuRef.current && menuRef.current.contains(event.target)) return;

      let target = event.target;
      while (target && target.tagName.toLowerCase() !== 'article') {
        target = target.parentElement;
      }

      if (!target) return;

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
      className="dropdown-menu sf-metadata-contextmenu"
      style={position}
    >
      {options.map((option, index) => (
        <button
          key={index}
          className="dropdown-item sf-metadata-contextmenu-item"
          onClick={(event) => handleOptionClick(event, option)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

ContextMenu.propTypes = {
  isDir: PropTypes.bool.isRequired,
  getContainerRect: PropTypes.func.isRequired,
  onOpenInNewTab: PropTypes.func.isRequired,
  onOpenParentFolder: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default ContextMenu;
