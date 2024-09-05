import React, { useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { UncontrolledTooltip } from 'reactstrap';
import { DragSource, DropTarget } from 'react-dnd';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { COLUMNS_ICON_CONFIG, COLUMNS_ICON_NAME } from '../../../../../../../_basic';
import ResizeColumnHandle from './resize-column-handle';
import { EVENT_BUS_TYPE } from '../../../../../../../constants';
import DropdownMenu from './dropdown-menu';
import { gettext } from '../../../../../../../utils';

import './index.css';


const dragSource = {
  beginDrag: props => {
    return { key: props.column.key, column: props.column };
  },
  endDrag(props, monitor) {
    const source = monitor.getItem();
    const didDrop = monitor.didDrop();
    let target = {};
    if (!didDrop) {
      return { source, target };
    }
  },
  isDragging(props) {
    const { column, dragged } = props;
    const { key } = dragged;
    return key === column.key;
  }
};

const dropTarget = {
  hover(props, monitor, component) {
    // This is fired very often and lets you perform side effects.
    if (!window.sfMetadataBody) return;
    let defaultColumnWidth = 200;
    const offsetX = monitor.getClientOffset().x;
    const width = document.querySelector('.sf-metadata-wrapper')?.clientWidth;
    const left = window.innerWidth - width;
    if (width <= 800) {
      defaultColumnWidth = 20;
    }
    if (offsetX > window.innerWidth - defaultColumnWidth) {
      window.sfMetadataBody.scrollToRight();
    } else if (offsetX < props.frozenColumnsWidth + defaultColumnWidth + left) {
      window.sfMetadataBody.scrollToLeft();
    } else {
      window.sfMetadataBody.clearHorizontalScroll();
    }
  },
  drop(props, monitor) {
    const source = monitor.getItem();
    const { column: targetColumn } = props;
    if (targetColumn.key !== source.key && source.column.frozen === targetColumn.frozen) {
      let target = { key: targetColumn.key };
      props.onMove(source, target);
      window.sfMetadataBody.clearHorizontalScroll();
    }
  }
};

const dragCollect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging(),
});

const dropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
  dragged: monitor.getItem(),
});

const Cell = ({
  isOver,
  isDragging,
  canDrop,
  connectDragSource,
  connectDragPreview,
  connectDropTarget,
  frozen,
  groupOffsetLeft,
  isLastFrozenCell,
  height,
  isHideTriangle,
  column,
  style: propsStyle,
  renameColumn,
  deleteColumn,
  modifyColumnData,
  modifyLocalColumnWidth,
  modifyColumnWidth,
}) => {
  const headerCellRef = useRef(null);

  const canEditColumnInfo = useMemo(() => {
    if (isHideTriangle) return false;
    return window.sfMetadataContext.canModifyColumn(column);
  }, [isHideTriangle, column]);

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

  const onDrag = useCallback((e) => {
    const width = getWidthFromMouseEvent(e);
    if (width > 0) {
      modifyLocalColumnWidth(column, width);
    }
  }, [column, getWidthFromMouseEvent, modifyLocalColumnWidth]);

  const onDragEnd = useCallback((e) => {
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
        <UncontrolledTooltip placement="bottom" target={`header-icon-${key}`} fade={false} trigger="hover">
          {gettext(headerIconTooltip)}
        </UncontrolledTooltip>
        <div className="header-name d-flex">
          <span title={name} className={classnames('header-name-text', { 'double': height === 56 })}>{name}</span>
        </div>
      </div>
      {canEditColumnInfo && (
        <DropdownMenu
          column={column}
          renameColumn={renameColumn}
          deleteColumn={deleteColumn}
          modifyColumnData={modifyColumnData}
        />
      )}
      <ResizeColumnHandle onDrag={onDrag} onDragEnd={onDragEnd} />
    </div>
  );

  if (!canModifyColumnOrder) {
    return (
      <div key={key} className="sf-metadata-record-header-cell">
        {cell}
      </div>
    );
  }

  return (
    <div key={key} className="sf-metadata-record-header-cell">
      {connectDropTarget(
        connectDragPreview(
          connectDragSource(
            <div style={{ opacity: isDragging ? 0.2 : 1 }} className={classnames('rdg-can-drop', { 'rdg-dropping': isOver && canDrop })}>
              {cell}
            </div>
          )
        )
      )}
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
  renameColumn: PropTypes.func,
  deleteColumn: PropTypes.func,
  modifyColumnData: PropTypes.func,
  modifyLocalColumnWidth: PropTypes.func,
};

export default DropTarget('sfMetadataRecordHeaderCell', dropTarget, dropCollect)(
  DragSource('sfMetadataRecordHeaderCell', dragSource, dragCollect)(Cell)
);
