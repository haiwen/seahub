import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Popover } from 'reactstrap';
import SingleSelectEditor from '../../metadata/components/cell-editors/single-select-editor';
import { KeyCodes } from '../../constants';
import { PRIVATE_COLUMN_KEY } from '../../metadata/constants';
import { eventBus } from '../common/event-bus';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';
import SingleSelectFormatter from '@/metadata/components/cell-formatter/single-select';

import './index.css';
import { DEFAULT_FILE_STATUS_OPTIONS } from '@/metadata/constants/column/format';

const STATUS_EDITOR_CONFIG = {
  MIN_WIDTH: 200,
  MIN_SPACE_NEEDED: 250,
  POPOVER_OFFSET: '2px',
  EDITOR_PADDING: '0 10px'
};

const StatusEditor = ({
  value,
  record,
  column,
  className = '',
  canEdit = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const containerRef = useRef(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    const originalSfMetadataContext = window.sfMetadataContext || null;
    const needsContextSetup =
      !window.sfMetadataContext ||
      typeof window.sfMetadataContext.canModifyColumnData !== 'function';

    if (needsContextSetup) {
      window.sfMetadataContext = {
        ...(window.sfMetadataContext || {}),
        canModifyColumnData: (column) => {
          return column.key === PRIVATE_COLUMN_KEY.FILE_STATUS && canEdit;
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
  }, [canEdit]);

  const handleStatusChange = useCallback(async (newValue) => {
    if (!canEdit) return;

    setCurrentValue(newValue);
    setIsEditing(false);
    eventBus.dispatch(EVENT_BUS_TYPE.DIRENT_STATUS_CHANGED, record.name, newValue);
  }, [record, canEdit]);

  const handleEditorCommit = useCallback((newValue) => {
    if (newValue === undefined || newValue === null || newValue === currentValue) {
      setIsEditing(false);
      return;
    }
    handleStatusChange(newValue);
  }, [currentValue, handleStatusChange]);

  const modifyColumnData = useCallback((columnKey, newData) => {
    eventBus.dispatch(EVENT_BUS_TYPE.COLUMN_DATA_MODIFIED, columnKey, newData);
  }, []);

  const handleClick = useCallback(() => {
    if (canEdit) {
      setIsEditing(true);
    }
  }, [canEdit]);

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
          column={column}
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
  }, [isEditing, displayValue, record, column, handleEditorCommit, modifyColumnData, containerRef]);

  return (
    <div
      ref={containerRef}
      className={`editable-status-wrapper ${isEditing ? 'editing' : ''} ${className} ${!canEdit ? 'readonly' : ''}`}
      onClick={handleClick}
    >
      {displayValue ? (
        <SingleSelectFormatter value={displayValue} options={column?.data?.options || DEFAULT_FILE_STATUS_OPTIONS} className="dirent-property dirent-property-status" />
      ) : (
        <span className="text-muted empty-status-placeholder"></span>
      )}
      {containerRef.current && renderEditor()}
    </div>
  );
};

StatusEditor.propTypes = {
  value: PropTypes.string,
  record: PropTypes.object,
  column: PropTypes.object,
  className: PropTypes.string,
  canEdit: PropTypes.bool,
  options: PropTypes.array,
};

export default StatusEditor;
