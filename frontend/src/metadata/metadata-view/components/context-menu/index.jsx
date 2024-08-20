import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { PRIVATE_COLUMN_KEY } from '../../_basic';
import { gettext } from '../../utils';
import { siteRoot } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';

import './index.css';

const OPERATION = {
  CLEAR_SELECTED: 'clear-selected',
  COPY_SELECTED: 'copy-selected',
  OPEN_PARENT_FOLDER: 'open-parent-folder',
  OPEN_IN_NEW_TAB: 'open-new-tab',
};

const ContextMenu = ({
  isGroupView,
  selectedRange,
  selectedPosition,
  recordMetrics,
  recordGetterByIndex,
  onClearSelected,
  onCopySelected,
}) => {
  const menuRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const options = useMemo(() => {
    const permission = window.sfMetadataContext.getPermission();
    const isReadonly = permission === 'r';
    let list = [];

    if (selectedRange) {
      !isReadonly && list.push({ value: OPERATION.CLEAR_SELECTED, label: gettext('Clear selected') });
      list.push({ value: OPERATION.COPY_SELECTED, label: gettext('Copy selected') });
      return list;
    }

    if (Object.keys(recordMetrics.idSelectedRecordMap) > 1) {
      return [];
    }

    if (!selectedPosition) return list;
    const { groupRecordIndex, rowIdx: recordIndex } = selectedPosition;
    const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex });
    if (!record) return list;
    const isFolder = record[PRIVATE_COLUMN_KEY.IS_DIR];
    list.push({ value: OPERATION.OPEN_IN_NEW_TAB, label: isFolder ? gettext('Open folder in new tab') : gettext('Open file in new tab') });
    list.push({ value: OPERATION.OPEN_PARENT_FOLDER, label: gettext('Open parent folder') });

    return list;
  }, [isGroupView, selectedPosition, recordMetrics, selectedRange, recordGetterByIndex]);

  const handleHide = useCallback((event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setVisible(false);
    }
  }, [menuRef]);

  const onOpenFileInNewTab = useCallback(() => {
    const { groupRecordIndex, rowIdx } = selectedPosition;
    const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex: rowIdx });
    if (!record) return;
    const repoID = window.sfMetadataStore.repoId;
    const isFolder = record[PRIVATE_COLUMN_KEY.IS_DIR];
    const parentDir = record[PRIVATE_COLUMN_KEY.PARENT_DIR];
    const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];

    let url;
    if (isFolder) {
      url = window.location.origin + window.location.pathname + Utils.encodePath(Utils.joinPath(parentDir, fileName));
    } else {
      url = `${siteRoot}lib/${repoID}/file${Utils.encodePath(Utils.joinPath(parentDir, fileName))}`;
    }

    window.open(url, '_blank');
  }, [isGroupView, recordGetterByIndex, selectedPosition]);

  const onOpenParentFolder = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const { groupRecordIndex, rowIdx } = selectedPosition;
    const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex: rowIdx });
    if (!record) return;
    const parentDir = record[PRIVATE_COLUMN_KEY.PARENT_DIR];
    const url = window.location.origin + window.location.pathname + Utils.encodePath(parentDir);
    window.open(url, '_blank');
  }, [isGroupView, recordGetterByIndex, selectedPosition]);

  const handleOptionClick = useCallback((event, option) => {
    event.stopPropagation();
    switch (option.value) {
      case OPERATION.OPEN_IN_NEW_TAB: {
        onOpenFileInNewTab();
        break;
      }
      case OPERATION.OPEN_PARENT_FOLDER: {
        onOpenParentFolder(event);
        break;
      }
      case OPERATION.COPY_SELECTED: {
        onCopySelected && onCopySelected();
        break;
      }
      case OPERATION.CLEAR_SELECTED: {
        onClearSelected && onClearSelected();
        break;
      }
      default: {
        break;
      }
    }
    setVisible(false);
  }, [onOpenFileInNewTab, onOpenParentFolder, onCopySelected, onClearSelected]);

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
  isGroupView: PropTypes.bool,
  selectedRange: PropTypes.object,
  selectedPosition: PropTypes.object,
  recordMetrics: PropTypes.object,
  recordGetterByIndex: PropTypes.func,
};

export default ContextMenu;
