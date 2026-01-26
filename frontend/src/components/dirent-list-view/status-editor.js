import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Popover } from 'reactstrap';
import SingleSelectEditor from '../../metadata/components/cell-editors/single-select-editor';
import { Utils } from '../../utils/utils';
import { KeyCodes } from '../../constants';
import toaster from '../toast';
import metadataAPI from '../../metadata/api';
import { PRIVATE_COLUMN_KEY, EVENT_BUS_TYPE } from '../../metadata/constants';

import './index.css';

const STATUS_OPTIONS = {
  IN_PROGRESS: {
    id: '_in_progress',
    name: 'In progress',
    color: '#EED5FF',
    textColor: '#212529'
  },
  IN_REVIEW: {
    id: '_in_review',
    name: 'In review',
    color: '#FFFDCF',
    textColor: '#212529'
  },
  DONE: {
    id: '_done',
    name: 'Done',
    color: '#59CB74',
    textColor: '#FFFFFF'
  },
  OUTDATED: {
    id: '_outdated',
    name: 'Outdated',
    color: '#C2C2C2',
    textColor: '#FFFFFF'
  }
};

const DEFAULT_STATUS_OPTIONS = [
  STATUS_OPTIONS.IN_PROGRESS,
  STATUS_OPTIONS.IN_REVIEW,
  STATUS_OPTIONS.DONE,
  STATUS_OPTIONS.OUTDATED
];

const STATUS_EDITOR_CONFIG = {
  MIN_WIDTH: 200,
  MIN_SPACE_NEEDED: 250,
  POPOVER_OFFSET: '2px',
  EDITOR_PADDING: '0 10px'
};

const ensureStatusOptionsHaveColors = (options) => {
  if (!options || !Array.isArray(options)) return [];

  return options.map(option => {
    const id = option.id;

    if (id === STATUS_OPTIONS.IN_PROGRESS.id) {
      return {
        ...option,
        name: STATUS_OPTIONS.IN_PROGRESS.name,
        color: option.color || STATUS_OPTIONS.IN_PROGRESS.color,
        textColor: option.textColor || STATUS_OPTIONS.IN_PROGRESS.textColor
      };
    } else if (id === STATUS_OPTIONS.IN_REVIEW.id) {
      return {
        ...option,
        name: STATUS_OPTIONS.IN_REVIEW.name,
        color: option.color || STATUS_OPTIONS.IN_REVIEW.color,
        textColor: option.textColor || STATUS_OPTIONS.IN_REVIEW.textColor
      };
    } else if (id === STATUS_OPTIONS.DONE.id) {
      return {
        ...option,
        name: STATUS_OPTIONS.DONE.name,
        color: option.color || STATUS_OPTIONS.DONE.color,
        textColor: option.textColor || STATUS_OPTIONS.DONE.textColor
      };
    } else if (id === STATUS_OPTIONS.OUTDATED.id) {
      return {
        ...option,
        name: STATUS_OPTIONS.OUTDATED.name,
        color: option.color || STATUS_OPTIONS.OUTDATED.color,
        textColor: option.textColor || STATUS_OPTIONS.OUTDATED.textColor
      };
    }

    return option;
  });
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

    let option = null;

    if (options && options.length > 0) {
      const found = options.find(o => o.id === value || o.name === value);
      if (found) {
        if (value === STATUS_OPTIONS.IN_PROGRESS.id) {
          option = STATUS_OPTIONS.IN_PROGRESS;
        } else if (value === STATUS_OPTIONS.IN_REVIEW.id) {
          option = STATUS_OPTIONS.IN_REVIEW;
        } else if (value === STATUS_OPTIONS.DONE.id) {
          option = STATUS_OPTIONS.DONE;
        } else if (value === STATUS_OPTIONS.OUTDATED.id) {
          option = STATUS_OPTIONS.OUTDATED;
        } else {
          option = {
            id: found.id,
            name: found.id,
            color: found.color || '#eaeaea',
            textColor: found.textColor || '#212529'
          };
        }
      }
    }

    if (!option) {
      if (value === STATUS_OPTIONS.IN_PROGRESS.id) {
        option = STATUS_OPTIONS.IN_PROGRESS;
      } else if (value === STATUS_OPTIONS.IN_REVIEW.id) {
        option = STATUS_OPTIONS.IN_REVIEW;
      } else if (value === STATUS_OPTIONS.DONE.id) {
        option = STATUS_OPTIONS.DONE;
      } else if (value === STATUS_OPTIONS.OUTDATED.id) {
        option = STATUS_OPTIONS.OUTDATED;
      } else {
        option = {
          id: value,
          name: value,
          color: '#eaeaea',
          textColor: '#212529'
        };
      }
    }

    return option;
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
  value,
  repoID,
  path,
  fileName,
  record,
  onStatusChange,
  className = '',
  canEdit = true,
  statusColumnOptions = null,
  dirent,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [options, setOptions] = useState([]);
  const [isOptionsLoaded, setIsOptionsLoaded] = useState(false);
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
        },
        destroy: () => {}
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

  useEffect(() => {
    if (statusColumnOptions && statusColumnOptions.length > 0) {
      const optionsWithColors = ensureStatusOptionsHaveColors(statusColumnOptions);
      setOptions(optionsWithColors);
      setIsOptionsLoaded(true);
    } else {
      setOptions(DEFAULT_STATUS_OPTIONS);
      setIsOptionsLoaded(true);
    }
  }, [statusColumnOptions]);

  const handleStatusChange = useCallback(async (newValue) => {
    if (isUpdating || !hasPermission) return;

    setIsUpdating(true);
    try {
      const updateData = { [PRIVATE_COLUMN_KEY.FILE_STATUS]: newValue };
      await metadataAPI.modifyRecord(repoID, { parentDir: path, fileName }, updateData);

      setCurrentValue(newValue);

      if (window?.sfMetadataContext?.eventBus) {
        window.sfMetadataContext.eventBus.dispatch(
          EVENT_BUS_TYPE.LOCAL_RECORD_DETAIL_CHANGED,
          { parentDir: path, fileName },
          updateData
        );
      }

      if (onStatusChange) {
        onStatusChange(newValue, { isLocalUpdate: true });
      }

      setIsEditing(false);
    } catch (error) {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    } finally {
      setIsUpdating(false);
    }
  }, [repoID, path, fileName, onStatusChange, isUpdating, hasPermission]);

  const handleClick = useCallback(() => {
    if (!isUpdating && isOptionsLoaded && hasPermission) {
      setIsEditing(true);
    }
  }, [isUpdating, isOptionsLoaded, hasPermission]);

  useEffect(() => {
    let isMounted = true;

    const handleClickOutside = (event) => {
      if (!isMounted || !isEditing) return;
      if (containerRef.current && !containerRef.current.contains(event.target)) {
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

  const handleEditorCommit = useCallback((newValue) => {
    if (newValue !== currentValue) {
      handleStatusChange(newValue);
    } else {
      setIsEditing(false);
    }
  }, [currentValue, handleStatusChange]);

  const displayValue = useMemo(() => {
    if (!currentValue) return null;
    if (typeof currentValue === 'object' && (currentValue.id || currentValue.name)) {
      return currentValue.id || currentValue.name;
    }
    return currentValue;
  }, [currentValue]);

  const renderEditor = useCallback(() => {
    if (!isEditing || !containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, STATUS_EDITOR_CONFIG.MIN_WIDTH);

    if (!window.sfMetadataContext || typeof window.sfMetadataContext.canModifyColumnData !== 'function') {
      window.sfMetadataContext = {
        ...(window.sfMetadataContext || {}),
        canModifyColumnData: (column) => {
          return column.key === PRIVATE_COLUMN_KEY.FILE_STATUS;
        },
        destroy: () => {}
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
          modifyColumnData={() => {}}
        />
      </div>
    );

    return (
      <Popover
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
  }, [isEditing, displayValue, options, record, handleEditorCommit, containerRef]);

  if (!isOptionsLoaded) {
    return (
      <div className="editable-status-wrapper" ref={containerRef}>
        <ListViewStatusFormatter value={displayValue} options={[]} />
      </div>
    );
  }

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
      {isUpdating && (
        <div className="editable-status-loading">
          <span className="loading-shimmer">-</span>
        </div>
      )}
      {containerRef.current && renderEditor()}
    </div>
  );
};

StatusEditor.propTypes = {
  value: PropTypes.string,
  repoID: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  fileName: PropTypes.string.isRequired,
  record: PropTypes.object,
  onStatusChange: PropTypes.func,
  className: PropTypes.string,
  canEdit: PropTypes.bool,
  statusColumnOptions: PropTypes.array,
  dirent: PropTypes.object,
};

export default StatusEditor;
