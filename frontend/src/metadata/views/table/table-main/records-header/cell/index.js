import React, { useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { UncontrolledTooltip } from 'reactstrap';
import { Icon } from '@seafile/sf-metadata-ui-component';
import ResizeColumnHandle from './resize-column-handle';
import DropdownMenu from './dropdown-menu';
import { gettext } from '../../../../../../utils/constants';
import { COLUMNS_ICON_CONFIG, COLUMNS_ICON_NAME, EVENT_BUS_TYPE } from '../../../../../constants';

import './index.css';

const Cell = ({
  frozen,
  groupOffsetLeft,
  isLastFrozenCell,
  height,
  isHideTriangle,
  column,
  style: propsStyle,
  draggingColumnKey,
  dragOverColumnKey,
  view,
  frozenColumnsWidth,
  renameColumn,
  deleteColumn,
  modifyColumnData,
  modifyLocalColumnWidth,
  modifyColumnWidth,
  onMove,
  updateDraggingKey,
  updateDragOverKey,
  getColumnIndexByKey,
}) => {
  const headerCellRef = useRef(null);

  const canEditColumnInfo = useMemo(() => {
    if (isHideTriangle) return false;
    return window.sfMetadataContext.canModify();
  }, [isHideTriangle]);

  const style = useMemo(() => {
    const { left, width } = column;
    let value = Object.assign({ width, maxWidth: width, minWidth: width, height }, propsStyle);
    if (!frozen) {
      value.left = left + groupOffsetLeft;
    }
    return value;
  }, [frozen, groupOffsetLeft, column, height, propsStyle]);

  const getWidthFromMouseEvent = useCallback((e) => {
    let right = e.pageX || (e.touches && e.touches[0] && e.touches[0].pageX) || (e.changedTouches && e.changedTouches[e.changedTouches.length - 1].pageX);
    if (e.pageX === 0) {
      right = 0;
    }
    const left = headerCellRef.current.getBoundingClientRect().left;
    return right - left;
  }, []);

  const onDraggingColumnWidth = useCallback((e) => {
    const width = getWidthFromMouseEvent(e);
    if (width > 0) {
      modifyLocalColumnWidth(column, width);
    }
  }, [column, getWidthFromMouseEvent, modifyLocalColumnWidth]);

  const handleColumnWidth = useCallback((e) => {
    const width = getWidthFromMouseEvent(e);
    if (width > 0) {
      modifyColumnWidth(column, Math.max(width, 50));
    }
  }, [column, getWidthFromMouseEvent, modifyColumnWidth]);

  const handleHeaderCellClick = useCallback((column) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_COLUMN, column);
  }, []);

  const onContextMenu = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const onDragStart = useCallback((event) => {
    const dragData = JSON.stringify({ type: 'sf-metadata-view-header-order', column_key: column.key, column });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/drag-sf-metadata-view-header-order', dragData);
    updateDraggingKey(column.key);
  }, [column, updateDraggingKey]);

  const onDragEnter = useCallback(() => {
    updateDragOverKey(column.key);
  }, [column, updateDragOverKey]);

  const onDragLeave = useCallback(() => {
    updateDragOverKey(null);
  }, [updateDragOverKey]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    updateDragOverKey(column.key);
    if (!window.sfMetadataBody) return;
    let defaultColumnWidth = 200;
    const offsetX = event.clientX;
    const width = document.querySelector('.sf-metadata-wrapper')?.clientWidth;
    const left = window.innerWidth - width;
    if (width <= 800) {
      defaultColumnWidth = 20;
    }
    if (offsetX > window.innerWidth - defaultColumnWidth) {
      window.sfMetadataBody.scrollToRight();
    } else if (offsetX < frozenColumnsWidth + defaultColumnWidth + left) {
      window.sfMetadataBody.scrollToLeft();
    } else {
      window.sfMetadataBody.clearHorizontalScroll();
    }
  }, [column, frozenColumnsWidth, updateDragOverKey]);

  const onDrop = useCallback((event) => {
    event.stopPropagation();
    let dragData = event.dataTransfer.getData('application/drag-sf-metadata-view-header-order');
    if (!dragData) return false;
    dragData = JSON.parse(dragData);
    if (dragData.type !== 'sf-metadata-view-header-order' || !dragData.column_key) return false;
    if (dragData.column_key !== column.key && dragData.column.frozen === column.frozen) {
      onMove && onMove({ key: dragData.column_key }, { key: column.key });
    }
  }, [column, onMove]);

  const onDragEnd = useCallback(() => {
    updateDraggingKey(null);
    updateDragOverKey(null);
  }, [updateDraggingKey, updateDragOverKey]);

  const { key, name, type } = column;
  const headerIconTooltip = COLUMNS_ICON_NAME[type];
  const canModifyColumnOrder = window.sfMetadataContext.canModifyColumnOrder();
  const cell = (
    <div
      className={classnames('sf-metadata-result-table-cell column', { 'table-last--frozen': isLastFrozenCell })}
      ref={headerCellRef}
      style={style}
      id={`sf-metadata-column-${key}`}
      onClick={() => handleHeaderCellClick(column, frozen)}
      onContextMenu={onContextMenu}
    >
      <div className="sf-metadata-result-column-content sf-metadata-record-header-cell-left d-flex align-items-center text-truncate">
        <span className="mr-2" id={`header-icon-${key}`}>
          <Icon iconName={COLUMNS_ICON_CONFIG[type]} className="sf-metadata-column-icon" />
        </span>
        <UncontrolledTooltip placement="bottom" target={`header-icon-${key}`} fade={false} trigger="hover" className="sf-metadata-tooltip">
          {gettext(headerIconTooltip)}
        </UncontrolledTooltip>
        <div className="header-name d-flex">
          <span title={name} className={classnames('header-name-text', { 'double': height === 56 })}>{name}</span>
        </div>
      </div>
      {canEditColumnInfo && (
        <DropdownMenu
          column={column}
          view={view}
          renameColumn={renameColumn}
          deleteColumn={deleteColumn}
          modifyColumnData={modifyColumnData}
        />
      )}
      <ResizeColumnHandle onDrag={onDraggingColumnWidth} onDragEnd={handleColumnWidth} />
    </div>
  );

  if (!canModifyColumnOrder) {
    return (
      <div key={key} className="sf-metadata-record-header-cell">
        {cell}
      </div>
    );
  }

  const draggingColumnIndex = getColumnIndexByKey(draggingColumnKey);
  const dragOverColumnIndex = getColumnIndexByKey(dragOverColumnKey);
  const isOver = dragOverColumnKey === column.key;

  return (
    <div key={key} className="sf-metadata-record-header-cell">
      <div
        draggable="true"
        style={{ opacity: draggingColumnKey === column.key ? 0.2 : 1 }}
        className={classnames('rdg-can-drop', {
          'rdg-dropping rdg-dropping-position': isOver,
          'rdg-dropping-position-left': isOver && draggingColumnIndex > dragOverColumnIndex,
          'rdg-dropping-position-right': isOver && draggingColumnIndex < dragOverColumnIndex,
        })}
        onDragStart={onDragStart}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      >
        {cell}
      </div>
    </div>
  );
};

Cell.defaultProps = {
  style: null,
};

Cell.propTypes = {
  groupOffsetLeft: PropTypes.number,
  height: PropTypes.number,
  column: PropTypes.object,
  style: PropTypes.object,
  frozen: PropTypes.bool,
  isLastFrozenCell: PropTypes.bool,
  isHideTriangle: PropTypes.bool,
  draggingColumnKey: PropTypes.string,
  dragOverColumnKey: PropTypes.string,
  view: PropTypes.object,
  renameColumn: PropTypes.func,
  deleteColumn: PropTypes.func,
  modifyColumnData: PropTypes.func,
  modifyLocalColumnWidth: PropTypes.func,
  updateDraggingKey: PropTypes.func,
  updateDragOverKey: PropTypes.func,
  getColumnIndexByKey: PropTypes.func,
};

export default Cell;
