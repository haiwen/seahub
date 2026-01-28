import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Popover } from 'reactstrap';
import SingleSelectEditor from '../../metadata/components/cell-editors/single-select-editor';
import { Utils } from '../../utils/utils';
import { KeyCodes } from '../../constants';
import toaster from '../toast';
import { PRIVATE_COLUMN_KEY } from '../../metadata/constants';
import metadataAPI from '../../metadata/api';
import { STATUS_OPTIONS, formatStatusOptions } from './column-config';

import './index.css';
import { eventBus } from '../common/event-bus';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';

const STATUS_EDITOR_CONFIG = {
  MIN_WIDTH: 200,
  MIN_SPACE_NEEDED: 250,
  POPOVER_OFFSET: '2px',
  EDITOR_PADDING: '0 10px'
};

const ListViewStatusFormatter = ({ value, options = [], className }) => {
  const displayData = useMemo(() => {
    if (!value) {
      return {
        id: '',
        name: '',
        color: 'transparent',
        textColor: 'transparent'
      };
    }

    if (options && options.length > 0) {
      const found = options.find(o => o.id === value || o.name === value);
      if (found) {
        return found;
      }
    }

    if (value === STATUS_OPTIONS.IN_PROGRESS.name) {
      return STATUS_OPTIONS.IN_PROGRESS;
    } else if (value === STATUS_OPTIONS.IN_REVIEW.name) {
      return STATUS_OPTIONS.IN_REVIEW;
    } else if (value === STATUS_OPTIONS.DONE.name) {
      return STATUS_OPTIONS.DONE;
    } else if (value === STATUS_OPTIONS.OUTDATED.name) {
      return STATUS_OPTIONS.OUTDATED;
    } else {
      return {
        id: value,
        name: value,
        color: '#eaeaea',
        textColor: '#212529'
      };
    }
  }, [value, options]);

  if (!displayData) {
    return <span className="empty"></span>;
  }

  return (
    <div
      className={`list-view-status-option text-truncate ${className || ''}`}
      style={{
        backgroundColor: displayData.color,
        color: displayData.textColor,
      }}
      title={displayData.name}
    >
      {displayData.name}
    </div>
  );
};

const StatusEditor = ({
  repoID,
  value,
  record,
  className = '',
  canEdit = true,
  options,
  dirent,
  onStatusColumnOptionsChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const containerRef = useRef(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const hasPermission = useMemo(() => {
    if (!canEdit) return false;
    if (!dirent) return true;
    const permission = dirent.permission || '';
    return permission.includes('w');
  }, [canEdit, dirent]);

  useEffect(() => {
    const originalSfMetadataContext = window.sfMetadataContext || null;
    const needsContextSetup =
      !window.sfMetadataContext ||
      typeof window.sfMetadataContext.canModifyColumnData !== 'function';

    if (needsContextSetup) {
      window.sfMetadataContext = {
        ...(window.sfMetadataContext || {}),
        canModifyColumnData: (column) => {
          return column.key === PRIVATE_COLUMN_KEY.FILE_STATUS && hasPermission;
        }
      };
    }

    return () => {
      if (originalSfMetadataContext === null) {
        if (window.sfMetadataContext) {
          delete window.sfMetadataContext.canModifyColumnData;
          const keys = Object.keys(window.sfMetadataContext);
          if (keys.length === 0 || (keys.length === 1 && keys[0] === 'canModifyColumnData')) {
            window.sfMetadataContext = undefined;
          }
        }
      }
    };
  }, [hasPermission]);

  const handleStatusChange = useCallback(async (newValue) => {
    if (!hasPermission) return;

    setCurrentValue(newValue);
    setIsEditing(false);
    eventBus.dispatch(EVENT_BUS_TYPE.DIRENT_STATUS_CHANGED, dirent.name, newValue);
  }, [hasPermission, dirent]);

  const handleEditorCommit = useCallback((newValue) => {
    if (newValue === undefined || newValue === null || newValue === currentValue) {
      setIsEditing(false);
      return;
    }
    handleStatusChange(newValue);
  }, [currentValue, handleStatusChange]);

  const modifyColumnData = useCallback(async (columnKey, newData) => {
    try {
      const optionsWithColors = formatStatusOptions(newData.options);
      onStatusColumnOptionsChange(optionsWithColors);
      await metadataAPI.modifyColumnData(repoID, columnKey, newData);
    } catch (error) {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    }
  }, [repoID, onStatusColumnOptionsChange]);

  const handleClick = useCallback(() => {
    if (hasPermission) {
      setIsEditing(true);
    }
  }, [hasPermission]);

  useEffect(() => {
    let isMounted = true;

    const handleClickOutside = (event) => {
      if (!isMounted || !isEditing) return;

      if (containerRef.current && !containerRef.current.contains(event.target)) {
        const popoverElement = document.querySelector('.sf-metadata-property-editor-popover.editable-status-popover');
        if (popoverElement && popoverElement.contains(event.target)) {
          return;
        }
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      isMounted = false;
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const handleKeyDown = useCallback((event) => {
    if (event.keyCode === KeyCodes.Esc) {
      setIsEditing(false);
    }
  }, []);

  useEffect(() => {
    if (isEditing) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, handleKeyDown]);

  const displayValue = useMemo(() => {
    if (!currentValue) return null;
    if (typeof currentValue === 'object' && (currentValue.id || currentValue.name)) {
      return currentValue.id || currentValue.name;
    }
    return currentValue;
  }, [currentValue]);

  const popoverRef = useRef(null);

  const renderEditor = useCallback(() => {
    if (!isEditing || !containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, STATUS_EDITOR_CONFIG.MIN_WIDTH);

    if (!window.sfMetadataContext || typeof window.sfMetadataContext.canModifyColumnData !== 'function') {
      window.sfMetadataContext = {
        ...(window.sfMetadataContext || {}),
        canModifyColumnData: (column) => {
          return column.key === PRIVATE_COLUMN_KEY.FILE_STATUS;
        }
      };
    }

    const spaceOnRight = window.innerWidth - rect.right;
    const spaceOnLeft = rect.left;
    const minSpaceNeeded = STATUS_EDITOR_CONFIG.MIN_SPACE_NEEDED;

    const placement = spaceOnRight < minSpaceNeeded && spaceOnLeft > spaceOnRight
      ? 'bottom-end'
      : 'bottom-start';

    const editorClassName = placement === 'bottom-end'
      ? 'editable-status-editor editor-bottom-end'
      : 'editable-status-editor editor-bottom-start';

    const editor = (
      <div className={editorClassName} style={{ width: width }}>
        <SingleSelectEditor
          value={displayValue}
          column={{
            key: PRIVATE_COLUMN_KEY.FILE_STATUS,
            type: 'file_status',
            width: width,
            data: { options: options },
            editable: true
          }}
          columns={[]}
          record={record}
          onCommit={handleEditorCommit}
          modifyColumnData={modifyColumnData}
        />
      </div>
    );

    return (
      <Popover
        ref={popoverRef}
        target={containerRef}
        isOpen={true}
        placement={placement}
        hideArrow={true}
        fade={false}
        className="sf-metadata-property-editor-popover editable-status-popover"
        boundariesElement={document.body}
      >
        {editor}
      </Popover>
    );
  }, [isEditing, displayValue, options, record, handleEditorCommit, modifyColumnData, containerRef]);

  return (
    <div
      ref={containerRef}
      className={`editable-status-wrapper ${isEditing ? 'editing' : ''} ${className} ${!hasPermission ? 'readonly' : ''}`}
      onClick={handleClick}
    >
      {displayValue ? (
        <ListViewStatusFormatter value={displayValue} options={options} />
      ) : (
        <span className="text-muted empty-status-placeholder"></span>
      )}
      {containerRef.current && renderEditor()}
    </div>
  );
};

StatusEditor.propTypes = {
  repoID: PropTypes.string,
  value: PropTypes.string,
  record: PropTypes.object,
  className: PropTypes.string,
  canEdit: PropTypes.bool,
  options: PropTypes.array,
  dirent: PropTypes.object,
  onStatusColumnOptionsChange: PropTypes.func,
};

export default StatusEditor;
