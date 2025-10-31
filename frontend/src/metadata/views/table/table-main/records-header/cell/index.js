import React, { useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { UncontrolledTooltip } from 'reactstrap';
import Icon from '../../../../../../components/icon';
import ResizeColumnHandle from './resize-column-handle';
import DropdownMenu from './dropdown-menu';
import { gettext } from '../../../../../../utils/constants';
import { COLUMNS_ICON_CONFIG, COLUMNS_ICON_NAME, EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY } from '../../../../../constants';
import { Utils } from '../../../../../../utils/utils';

import './index.css';

const Cell = ({
  frozen,
  groupOffsetLeft,
  isLastFrozenCell,
  height,
  isHideTriangle,
  column,
  columnIndex,
  style: propsStyle = null,
  draggingColumnKey,
  draggingColumnIndex,
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
}) => {
  const headerCellRef = useRef(null);
  const dropdownRef = useRef(null);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frozen, groupOffsetLeft, column, column.left, height, propsStyle]);

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
    if (dropdownRef.current && dropdownRef.current.isPopoverShow()) return false;
    const dragData = JSON.stringify({ type: 'sf-metadata-view-header-order', column_key: column.key, column });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/drag-sf-metadata-view-header-order', dragData);
    updateDraggingKey(column.key);
  }, [column, dropdownRef, updateDraggingKey]);

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
    if (!window.sfMetadataBody) return;
    let defaultColumnWidth = 200;
    const offsetX = event.clientX;
    const width = document.querySelector('#sf-metadata-wrapper')?.clientWidth;
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
  }, [column, frozenColumnsWidth, updateDragOverKey, draggingColumnKey]);

  const onDrop = useCallback((event) => {
    if (!dropdownRef.current || !dropdownRef.current.isPopoverShow()) {
      event.stopPropagation();
      let dragData = event.dataTransfer.getData('application/drag-sf-metadata-view-header-order');
      if (!dragData) return false;
      dragData = JSON.parse(dragData);
      if (dragData.type !== 'sf-metadata-view-header-order' || !dragData.column_key) return false;
      if (dragData.column_key !== column.key && dragData.column.frozen === column.frozen) {
        onMove && onMove({ key: dragData.column_key }, { key: column.key });
      }
    }
  }, [column, onMove]);

  const onDragEnd = useCallback(() => {
    updateDraggingKey(null);
    updateDragOverKey(null);
    window.sfMetadataBody.clearHorizontalScroll();
  }, [updateDraggingKey, updateDragOverKey]);

  const { key, name, type } = column;
  const headerIconTooltip = COLUMNS_ICON_NAME[type];
  const canModifyColumnOrder = window.sfMetadataContext.canModifyColumnOrder();
  const isNameColumn = key === PRIVATE_COLUMN_KEY.FILE_NAME;
  const cell = (
    <div
      className={classnames('sf-metadata-result-table-cell column', { 'table-last--frozen': isLastFrozenCell, 'name-column': isNameColumn })}
      ref={headerCellRef}
      style={style}
      id={`sf-metadata-column-${key}`}
      onClick={() => handleHeaderCellClick(column, frozen)}
      role="button"
      tabIndex={0}
      onKeyDown={Utils.onKeyDown}
      onContextMenu={onContextMenu}
    >
      <div className="sf-metadata-result-column-content sf-metadata-record-header-cell-left d-flex align-items-center text-truncate">
        <span className="mr-2" id={`header-icon-${key}`}>
          <Icon symbol={COLUMNS_ICON_CONFIG[type]} className="sf-metadata-icon sf-metadata-column-icon" />
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
          ref={dropdownRef}
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

  if (!canModifyColumnOrder || isNameColumn) {
    return (
      <div key={key} className="sf-metadata-record-header-cell">
        {cell}
      </div>
    );
  }

  const isOver = dragOverColumnKey === column.key;

  return (
    <div key={key} className="sf-metadata-record-header-cell">
      <div
        draggable="true"
        style={{ opacity: draggingColumnKey === column.key ? 0.2 : 1 }}
        className={classnames('rdg-can-drop', {
          'rdg-dropping rdg-dropping-position': isOver,
          'rdg-dropping-position-left': isOver && draggingColumnIndex > columnIndex,
          'rdg-dropping-position-right': isOver && draggingColumnIndex < columnIndex,
          'rdg-dropping-position-none': isOver && draggingColumnIndex === columnIndex
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

Cell.propTypes = {
  groupOffsetLeft: PropTypes.number,
  height: PropTypes.number,
  column: PropTypes.object,
  columnIndex: PropTypes.number,
  style: PropTypes.object,
  frozen: PropTypes.bool,
  isLastFrozenCell: PropTypes.bool,
  isHideTriangle: PropTypes.bool,
  draggingColumnKey: PropTypes.string,
  draggingColumnIndex: PropTypes.number,
  dragOverColumnKey: PropTypes.string,
  view: PropTypes.object,
  renameColumn: PropTypes.func,
  deleteColumn: PropTypes.func,
  modifyColumnData: PropTypes.func,
  modifyLocalColumnWidth: PropTypes.func,
  updateDraggingKey: PropTypes.func,
  updateDragOverKey: PropTypes.func,
};

export default Cell;
