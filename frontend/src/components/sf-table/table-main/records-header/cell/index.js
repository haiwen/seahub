import React, { useRef, useCallback, useMemo, isValidElement, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { UncontrolledTooltip } from 'reactstrap';
import { Icon } from '@seafile/sf-metadata-ui-component';
import ResizeColumnHandle from '../resize-column-handle';
import HeaderDropdownMenu from '../dropdown-menu';
import EventBus from '../../../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../../constants/event-bus-type';
import { checkIsNameColumn } from '../../../utils/column';
import { MIN_COLUMN_WIDTH } from '../../../constants/grid';
import { NODE_CONTENT_LEFT_INDENT, NODE_ICON_LEFT_INDENT } from '../../../constants/tree';

import './index.css';

const Cell = ({
  frozen,
  moveable,
  resizable,
  showRecordAsTree,
  groupOffsetLeft,
  isLastFrozenCell,
  height,
  ColumnDropdownMenu,
  column,
  columnIndex,
  style: propsStyle = null,
  draggingColumnKey,
  draggingColumnIndex,
  dragOverColumnKey,
  frozenColumnsWidth,
  modifyLocalColumnWidth,
  modifyColumnWidth,
  onMove,
  updateDraggingKey,
  updateDragOverKey,
}) => {
  const [disableDragColumn, setDisableDragColumn] = useState(false);
  const headerCellRef = useRef(null);
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

  const handleDragEndColumnWidth = useCallback((e) => {
    const width = getWidthFromMouseEvent(e);
    if (width > 0) {
      modifyColumnWidth(column, Math.max(width, MIN_COLUMN_WIDTH));
    }
  }, [column, getWidthFromMouseEvent, modifyColumnWidth]);

  const handleHeaderCellClick = useCallback((column) => {
    const eventBus = EventBus.getInstance();
    eventBus.dispatch(EVENT_BUS_TYPE.SELECT_COLUMN, column);
  }, []);

  const onContextMenu = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const onDragStart = useCallback((event) => {
    if (disableDragColumn) return false;
    const dragData = JSON.stringify({ type: 'sf-table-header-order', column_key: column.key, column });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/drag-sf-table-header-order', dragData);
    updateDraggingKey(column.key);
  }, [column, disableDragColumn, updateDraggingKey]);

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
    if (!window.sfTableBody) return;
    let defaultColumnWidth = 200;
    const offsetX = event.clientX;
    const width = document.querySelector('.sf-table-wrapper')?.clientWidth;
    const left = window.innerWidth - width;
    if (width <= 800) {
      defaultColumnWidth = 20;
    }
    if (offsetX > window.innerWidth - defaultColumnWidth) {
      window.sfTableBody.scrollToRight();
    } else if (offsetX < frozenColumnsWidth + defaultColumnWidth + left) {
      window.sfTableBody.scrollToLeft();
    } else {
      window.sfTableBody.clearHorizontalScroll();
    }
  }, [column, frozenColumnsWidth, updateDragOverKey, draggingColumnKey]);

  const onDrop = useCallback((event) => {
    if (!disableDragColumn) {
      event.stopPropagation();
      let dragData = event.dataTransfer.getData('application/drag-sf-table-header-order');
      if (!dragData) return false;
      dragData = JSON.parse(dragData);
      if (dragData.type !== 'sf-table-header-order' || !dragData.column_key) return false;
      if (dragData.column_key !== column.key && dragData.column.frozen === column.frozen) {
        onMove && onMove({ key: dragData.column_key }, { key: column.key });
      }
    }
  }, [column, onMove, disableDragColumn]);

  const onDragEnd = useCallback(() => {
    updateDraggingKey(null);
    updateDragOverKey(null);
    window.sfTableBody.clearHorizontalScroll();
  }, [updateDraggingKey, updateDragOverKey]);

  const dragDropEvents = useMemo(() => {
    if (!moveable) return {};
    return {
      onDragStart,
      onDragEnter,
      onDragLeave,
      onDragOver,
      onDrop,
      onDragEnd,
    };
  }, [moveable, onDragStart, onDragEnter, onDragLeave, onDragOver, onDrop, onDragEnd]);

  const { key, display_name, icon_name, icon_tooltip } = column;
  const isNameColumn = checkIsNameColumn(column);

  const cellName = useMemo(() => {
    return (
      <>
        <span className="mr-2" id={`header-icon-${key}`}>
          {icon_name && <Icon iconName={icon_name} className="sf-table-column-icon" />}
        </span>
        {icon_tooltip &&
          <UncontrolledTooltip placement="bottom" target={`header-icon-${key}`} fade={false} trigger="hover" className="sf-table-tooltip">
            {icon_tooltip}
          </UncontrolledTooltip>
        }
        <div className="header-name d-flex">
          <span title={display_name} className={classnames('header-name-text', { 'double': height === 56 })}>{display_name}</span>
        </div>
      </>
    );
  }, [icon_name, display_name, height, icon_tooltip, key]);

  const cellContent = useMemo(() => {
    if (showRecordAsTree && isNameColumn) {
      return (
        <div className="sf-table-cell-tree-node">
          <span className="sf-table-record-tree-expand-icon" style={{ left: NODE_ICON_LEFT_INDENT }}></span>
          <div className="sf-table-cell-tree-node-content text-truncate"style={{ paddingLeft: NODE_CONTENT_LEFT_INDENT }}>
            {cellName}
          </div>
        </div>
      );
    }
    return cellName;
  }, [cellName, isNameColumn, showRecordAsTree]);

  const cell = useMemo(() => {
    return (
      <div
        className={classnames('sf-table-cell column', { 'table-last--frozen': isLastFrozenCell, 'name-column': isNameColumn })}
        ref={headerCellRef}
        style={style}
        id={`sf-metadata-column-${key}`}
        onClick={() => handleHeaderCellClick(column, frozen)}
        onContextMenu={onContextMenu}
      >
        <div className="sf-table-column-content sf-table-header-cell-left d-flex align-items-center text-truncate">
          {cellContent}
        </div>
        {isValidElement(ColumnDropdownMenu) && <HeaderDropdownMenu ColumnDropdownMenu={ColumnDropdownMenu} column={column} setDisableDragColumn={setDisableDragColumn} />}
        {resizable && <ResizeColumnHandle onDrag={onDraggingColumnWidth} onDragEnd={handleDragEndColumnWidth} />}
      </div>
    );
  }, [ColumnDropdownMenu, cellContent, key, column, style, frozen, resizable, isLastFrozenCell, isNameColumn, handleDragEndColumnWidth, handleHeaderCellClick, onContextMenu, onDraggingColumnWidth]);

  if (!moveable || isNameColumn) {
    return (
      <div key={key} className="sf-table-header-cell">
        {cell}
      </div>
    );
  }

  const isOver = dragOverColumnKey === column.key;

  return (
    <div key={key} className="sf-table-header-cell">
      <div
        draggable="true"
        style={{ opacity: draggingColumnKey === column.key ? 0.2 : 1 }}
        className={classnames('rdg-can-drop', {
          'rdg-dropping rdg-dropping-position': isOver,
          'rdg-dropping-position-left': isOver && draggingColumnIndex > columnIndex,
          'rdg-dropping-position-right': isOver && draggingColumnIndex < columnIndex,
          'rdg-dropping-position-none': isOver && draggingColumnIndex === columnIndex
        })}
        {...dragDropEvents}
      >
        {cell}
      </div>
    </div>
  );
};

Cell.propTypes = {
  groupOffsetLeft: PropTypes.number,
  height: PropTypes.number,
  column: PropTypes.object,
  ColumnDropdownMenu: PropTypes.object,
  columnIndex: PropTypes.number,
  style: PropTypes.object,
  frozen: PropTypes.bool,
  moveable: PropTypes.bool,
  resizable: PropTypes.bool,
  isLastFrozenCell: PropTypes.bool,
  draggingColumnKey: PropTypes.string,
  draggingColumnIndex: PropTypes.number,
  dragOverColumnKey: PropTypes.string,
  modifyLocalColumnWidth: PropTypes.func,
  updateDraggingKey: PropTypes.func,
  updateDragOverKey: PropTypes.func,
};

export default Cell;
