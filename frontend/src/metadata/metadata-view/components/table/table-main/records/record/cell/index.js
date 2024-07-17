import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import toaster from '../../../../../../../../components/toast';
import { PRIVATE_COLUMN_KEY, isFunction } from '../../../../../../_basic';
import { TABLE_SUPPORT_EDIT_TYPE_MAP } from '../../../../../../constants';
import { getCellValueByColumn } from '../../../../../../utils';
import { isCellValueChanged } from '../../../../../../utils/cell-comparer';
import CellFormatter from '../../../../../cell-formatter';
import CellOperationBtn from './operation-btn';

import './index.css';

class Cell extends React.Component {

  static defaultProps = {
    needBindEvents: true
  };

  state = {};

  shouldComponentUpdate(nextProps, nextState) {
    const {
      record: oldRecord, column, isCellSelected, isLastCell, highlightClassName,
      height, bgColor,
    } = this.props;
    const { record: newRecord, highlightClassName: newHighlightClassName, height: newHeight, column: newColumn, bgColor: newBgColor } = nextProps;
    // the modification of column is not currently supported, only the modification of cell data is considered
    const oldValue = oldRecord[column.name] || oldRecord[column.key];
    const newValue = newRecord[column.name] || newRecord[column.key];
    const isShouldUpdated = (
      isCellValueChanged(oldValue, newValue, column.type) ||
      oldRecord._last_modifier !== newRecord._last_modifier ||
      isCellSelected !== nextProps.isCellSelected ||
      isLastCell !== nextProps.isLastCell ||
      highlightClassName !== newHighlightClassName ||
      height !== newHeight ||
      column.left !== newColumn.left ||
      column.width !== newColumn.width ||
      bgColor !== newBgColor
    );
    return isShouldUpdated;
  }

  getCellClass = (hasComment) => {
    const { column, highlightClassName, isLastCell, isLastFrozenCell, isCellSelected } = this.props;
    const { isFileTipShow } = this.state;
    const { type } = column;
    const canEditable = window.sfMetadataContext.canModifyCell(column);
    return classnames('sf-metadata-result-table-cell', `sf-metadata-result-table-${type}-cell`, {
      'table-cell-uneditable': !canEditable && TABLE_SUPPORT_EDIT_TYPE_MAP[type],
      [highlightClassName]: highlightClassName,
      'last-cell': isLastCell,
      'table-last--frozen': isLastFrozenCell,
      'cell-selected': isCellSelected,
      'draging-file-to-cell': isFileTipShow,
      'row-comment-cell': hasComment,
    });
  };

  onCellClick = (e) => {
    const { column, groupRecordIndex, recordIndex, cellMetaData } = this.props;
    const cell = { idx: column.idx, groupRecordIndex, rowIdx: recordIndex };

    // select cell
    if (isFunction(cellMetaData.onCellClick)) {
      cellMetaData.onCellClick(cell, e);
    }
  };

  onCellDoubleClick = (e) => {
    const { column, groupRecordIndex, recordIndex, cellMetaData } = this.props;
    const cell = { idx: column.idx, groupRecordIndex, rowIdx: recordIndex };

    if (isFunction(cellMetaData.onCellDoubleClick)) {
      cellMetaData.onCellDoubleClick(cell, e);
    }
  };

  onCellMouseDown = (e) => {
    if (e.button === 2) return;
    const { column, groupRecordIndex, recordIndex, cellMetaData } = this.props;
    const cell = { idx: column.idx, groupRecordIndex, rowIdx: recordIndex };

    if (isFunction(cellMetaData.onCellMouseDown)) {
      cellMetaData.onCellMouseDown(cell, e);
    }
  };

  onCellMouseEnter = (e) => {
    const { column, groupRecordIndex, recordIndex, cellMetaData } = this.props;
    const cell = { idx: column.idx, groupRecordIndex, rowIdx: recordIndex };
    if (isFunction(cellMetaData.onCellMouseEnter)) {
      const mousePosition = { x: e.clientX, y: e.clientY };
      cellMetaData.onCellMouseEnter({ ...cell, mousePosition }, e);
    }
  };

  onCellMouseMove = (e) => {
    const { column, groupRecordIndex, recordIndex, cellMetaData } = this.props;
    const cell = { idx: column.idx, groupRecordIndex, rowIdx: recordIndex };
    if (isFunction(cellMetaData.onCellMouseMove)) {
      const mousePosition = { x: e.clientX, y: e.clientY };
      cellMetaData.onCellMouseMove({ ...cell, mousePosition }, e);
    }
  };

  onCellMouseLeave = () => {
    return;
  };

  getEvents = () => {
    return {
      onClick: this.onCellClick,
      onDoubleClick: this.onCellDoubleClick,
      onMouseDown: this.onCellMouseDown,
      onMouseEnter: this.onCellMouseEnter,
      onMouseMove: this.onCellMouseMove,
      onMouseLeave: this.onCellMouseLeave,
      onDragOver: this.onDragOver
    };
  };

  onDragOver = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  updateParentTips = (isFileTipShow) => {
    this.setState({ isFileTipShow: isFileTipShow });
  };

  onCellTipShow = (message) => {
    toaster.warning(message);
  };

  isDir = () => {
    const { record } = this.props;
    const isDirValue = record[PRIVATE_COLUMN_KEY.IS_DIR];
    if (typeof isDirValue === 'string') return isDirValue.toUpperCase() === 'TRUE';
    return isDirValue;
  };

  render = () => {
    const { frozen, record, column, needBindEvents, height, bgColor, isCellSelected } = this.props;
    const { key, left, width } = column;
    const readonly = true;
    const className = this.getCellClass(false);
    const cellStyle = {
      width,
      height,
    };
    if (!frozen) {
      cellStyle.left = left;
    }
    if (bgColor) {
      cellStyle['backgroundColor'] = bgColor;
    }
    const cellValue = getCellValueByColumn(record, column);
    const cellEvents = needBindEvents && this.getEvents();
    const props = {
      className,
      style: cellStyle,
      ...cellEvents,
    };
    const isDir = this.isDir();
    const cellContent = (
      <CellFormatter readonly={readonly} value={cellValue} field={column} isDir={isDir} />
    );

    return (
      <div key={`${record._id}-${key}`} {...props}>
        {cellContent}
        {isCellSelected && (<CellOperationBtn value={cellValue} column={column} isDir={isDir} />)}
      </div>
    );
  };
}

Cell.propTypes = {
  frozen: PropTypes.bool,
  isCellSelected: PropTypes.bool,
  isLastCell: PropTypes.bool,
  isLastFrozenCell: PropTypes.bool,
  cellMetaData: PropTypes.object,
  record: PropTypes.object.isRequired,
  groupRecordIndex: PropTypes.number,
  recordIndex: PropTypes.number.isRequired,
  column: PropTypes.object.isRequired,
  height: PropTypes.number,
  needBindEvents: PropTypes.bool,
  modifyRecord: PropTypes.func,
  lockRecordViaButton: PropTypes.func,
  modifyRecordViaButton: PropTypes.func,
  reloadCurrentRecord: PropTypes.func,
  highlightClassName: PropTypes.string,
  bgColor: PropTypes.string,
};

export default Cell;
