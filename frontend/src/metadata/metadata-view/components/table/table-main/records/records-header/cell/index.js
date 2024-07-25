import React, { useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { UncontrolledTooltip } from 'reactstrap';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { COLUMNS_ICON_CONFIG, COLUMNS_ICON_NAME, PRIVATE_COLUMN_KEYS } from '../../../../../../_basic';
import ResizeColumnHandle from './resize-column-handle';
import { EVENT_BUS_TYPE } from '../../../../../../constants';
import DropdownMenu from './dropdown-menu';
import { gettext } from '../../../../../../utils';

import './index.css';

const Cell = ({
  frozen,
  groupOffsetLeft,
  isLastFrozenCell,
  height,
  isHideTriangle,
  column,
  style: propsStyle,
  resizeColumnWidth,
  renameColumn,
  deleteColumn,
  modifyColumnData,
}) => {
  const headerCellRef = useRef(null);

  const canEditColumnInfo = useMemo(() => {
    if (isHideTriangle) return false;
    if (PRIVATE_COLUMN_KEYS.includes(column.key)) return false;
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
      resizeColumnWidth(column, width);
    }
  }, [column, getWidthFromMouseEvent, resizeColumnWidth]);

  const handleHeaderCellClick = useCallback((column) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_COLUMN, column);
  }, []);

  const { key, name, type } = column;
  const headerIconTooltip = COLUMNS_ICON_NAME[type];
  return (
    <div key={key} className="sf-metadata-record-header-cell">
      <div
        className={classnames('sf-metadata-result-table-cell column', { 'table-last--frozen': isLastFrozenCell })}
        ref={headerCellRef}
        style={style}
        id={`sf-metadata-column-${key}`}
        onClick={() => handleHeaderCellClick(column, frozen)}
      >
        <div className="sf-metadata-result-column-content sf-metadata-record-header-cell-left d-flex align-items-center text-truncate">
          <span className="mr-2" id={`header-icon-${key}`}>
            <Icon iconName={COLUMNS_ICON_CONFIG[type]} className="sf-metadata-column-icon" />
          </span>
          <UncontrolledTooltip placement="bottom" target={`header-icon-${key}`} fade={false} trigger="hover">
            {gettext(headerIconTooltip)}
          </UncontrolledTooltip>
          <div className="header-name d-flex">
            <span title={name} className={`header-name-text ${height === 56 && 'double'}`}>{name}</span>
          </div>
        </div>
        {canEditColumnInfo && (<DropdownMenu column={column} renameColumn={renameColumn} deleteColumn={deleteColumn} modifyColumnData={modifyColumnData} />)}
        <ResizeColumnHandle onDrag={onDrag} />
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
  resizeColumnWidth: PropTypes.func,
  renameColumn: PropTypes.func,
  deleteColumn: PropTypes.func,
  modifyColumnData: PropTypes.func,
};

export default Cell;
