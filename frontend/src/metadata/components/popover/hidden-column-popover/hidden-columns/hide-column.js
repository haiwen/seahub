import React, { useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Switch from '../../../../../components/switch';
import Icon from '../../../../../components/icon';
import { COLUMNS_ICON_CONFIG } from '../../../../constants';

const HideColumnItem = ({
  readOnly,
  isHidden,
  column,
  columnIndex,
  draggingColumnKey,
  draggingColumnIndex,
  dragOverColumnKey,
  updateDraggingKey,
  updateDragOverKey,
  onChange,
  onMove,
}) => {
  const ref = useRef(null);

  const onDragStart = useCallback((event) => {
    const dragData = JSON.stringify({ type: 'sf-metadata-field-display-setting', column_key: column.key, draggingColumnIndex: columnIndex });
    event.dataTransfer.setDragImage(ref.current, 10, 10);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/drag-sf-metadata-field-display-setting', dragData);
    updateDraggingKey(column.key);
  }, [column, updateDraggingKey, columnIndex]);

  const onDragEnter = useCallback(() => {
    if (!draggingColumnKey) return;
    updateDragOverKey(column.key);
  }, [column, updateDragOverKey, draggingColumnKey]);

  const onDragLeave = useCallback(() => {
    if (!draggingColumnKey) return;
    updateDragOverKey(null);
  }, [updateDragOverKey, draggingColumnKey]);

  const onDragOver = useCallback((event) => {
    if (!draggingColumnKey) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    updateDragOverKey(column.key);
  }, [column, updateDragOverKey, draggingColumnKey]);

  const onDrop = useCallback((event) => {
    event.stopPropagation();
    let dragData = event.dataTransfer.getData('application/drag-sf-metadata-field-display-setting');
    if (!dragData) return false;
    dragData = JSON.parse(dragData);
    if (dragData.type !== 'sf-metadata-field-display-setting' || !dragData.column_key) return false;
    if (dragData.column_key !== column.key) {
      // Pass position info: draggingColumnIndex to determine insert position
      onMove && onMove({ key: dragData.column_key, draggingColumnIndex: dragData.draggingColumnIndex }, { key: column.key, columnIndex });
    }
  }, [column, onMove, columnIndex]);

  const onDragEnd = useCallback(() => {
    updateDraggingKey(null);
    updateDragOverKey(null);
  }, [updateDraggingKey, updateDragOverKey]);

  const update = useCallback(() => {
    if (readOnly) return;
    onChange(column.key);
  }, [readOnly, column, onChange]);

  const isOver = dragOverColumnKey === column.key;

  // When draggingColumnIndex < columnIndex: dragging item is ABOVE target, moving DOWN
  // -> show BOTTOM drop line, insert AFTER target (insertIndex = indexOf(targetKey) + 1)
  // When draggingColumnIndex > columnIndex: dragging item is BELOW target, moving UP
  // -> show TOP drop line, insert BEFORE target (insertIndex = indexOf(targetKey))
  const showTopDrop = isOver && draggingColumnIndex > columnIndex;
  const showBottomDrop = isOver && draggingColumnIndex < columnIndex;

  return (
    <div
      ref={ref}
      className={classNames('hide-column-item', {
        'disabled': readOnly,
        'hide-column-can-drop-top': showTopDrop,
        'hide-column-can-drop': showBottomDrop,
        'dragging': draggingColumnKey === column.key
      })}
      onDrop={onDrop}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
    >
      {!readOnly && onMove && (
        <span className="d-flex drag-hide-column-handle" draggable="true" onDragStart={onDragStart}>
          <Icon symbol="drag" />
        </span>
      )}
      <Switch
        className="hide-column-item-switch"
        disabled={readOnly}
        checked={isHidden}
        placeholder={(
          <>
            <Icon className="sf-metadata-icon" symbol={COLUMNS_ICON_CONFIG[column.type]} />
            <span className="text-truncate">{column.name}</span>
          </>
        )}
        onChange={update}
      />
    </div>
  );
};

HideColumnItem.propTypes = {
  readOnly: PropTypes.bool,
  isHidden: PropTypes.bool,
  columnIndex: PropTypes.number,
  column: PropTypes.object.isRequired,
  draggingColumnKey: PropTypes.string,
  draggingColumnIndex: PropTypes.number,
  dragOverColumnKey: PropTypes.string,
  updateDraggingKey: PropTypes.func,
  updateDragOverKey: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  onMove: PropTypes.func,
};

export default HideColumnItem;
