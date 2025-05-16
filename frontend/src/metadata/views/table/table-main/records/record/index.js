import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Cell from './cell';
import ActionsCell from './actions-cell';
import { getFrozenColumns } from '../../../../../utils/column';
import { metadataZIndexes } from '../../../../../constants';

import './index.css';

class Record extends React.Component {

  componentDidMount() {
    this.checkScroll();
  }

  shouldComponentUpdate(nextProps) {
    return (
      nextProps.isGroupView !== this.props.isGroupView ||
      nextProps.hasSelectedCell !== this.props.hasSelectedCell ||
      (nextProps.hasSelectedCell && this.props.selectedPosition.idx !== nextProps.selectedPosition.idx) || // selected cell in same row but different column
      nextProps.isSelected !== this.props.isSelected ||
      nextProps.groupRecordIndex !== this.props.groupRecordIndex ||
      nextProps.index !== this.props.index ||
      nextProps.isLastRecord !== this.props.isLastRecord ||
      nextProps.lastFrozenColumnKey !== this.props.lastFrozenColumnKey ||
      nextProps.columns !== this.props.columns ||
      nextProps.colOverScanStartIdx !== this.props.colOverScanStartIdx ||
      nextProps.colOverScanEndIdx !== this.props.colOverScanEndIdx ||
      nextProps.record !== this.props.record ||
      nextProps.top !== this.props.top ||
      nextProps.left !== this.props.left ||
      nextProps.height !== this.props.height ||
      nextProps.searchResult !== this.props.searchResult ||
      nextProps.columnColor !== this.props.columnColor
    );
  }

  checkScroll = () => {
    this.cancelFixFrozenDOMs(this.props.scrollLeft);
  };

  cancelFixFrozenDOMs = (scrollLeft) => {
    const { isGroupView } = this.props;
    const frozenChildrenCount = this.frozenColumns.childElementCount;
    if (!this.frozenColumns || frozenChildrenCount < 1 || (isGroupView && frozenChildrenCount < 2)) {
      return;
    }
    this.frozenColumns.style.position = 'absolute';
    this.frozenColumns.style.marginLeft = scrollLeft + 'px';
    this.frozenColumns.style.marginTop = '0px';
  };

  onSelectRecord = (e) => {
    const { groupRecordIndex, index } = this.props;
    this.props.selectNoneCells();
    this.props.onSelectRecord({ groupRecordIndex, recordIndex: index }, e);
  };

  isCellSelected = (columnIdx) => {
    const { hasSelectedCell, selectedPosition } = this.props;
    if (!selectedPosition) return false;
    return hasSelectedCell && selectedPosition.idx === columnIdx;
  };

  isLastCell(columns, columnKey) {
    return columns[columns.length - 1].key === columnKey;
  }

  reloadCurrentRecord = () => {
    this.props.reloadRecords([this.props.record._id]);
  };

  getFrozenCells = () => {
    const {
      columns, lastFrozenColumnKey, groupRecordIndex, index: recordIndex, record,
      cellMetaData, isGroupView, height, columnColor
    } = this.props;
    const frozenColumns = getFrozenColumns(columns);
    if (frozenColumns.length === 0) return null;
    const recordId = record._id;
    return frozenColumns.map((column, index) => {
      const { key } = column;
      const isCellHighlight = this.isCellHighlight(key, recordId);
      const isCurrentCellHighlight = this.isCurrentCellHighlight(key, recordId);
      const highlightClassName = isCurrentCellHighlight ? 'cell-current-highlight' : isCellHighlight ? 'cell-highlight' : null;
      const isCellSelected = this.isCellSelected(columns.findIndex(col => col.key === key));
      const isLastCell = this.isLastCell(columns, key);
      const isLastFrozenCell = key === lastFrozenColumnKey;
      const bgColor = columnColor && columnColor[key];
      return (
        <Cell
          frozen
          key={column.key}
          record={record}
          groupRecordIndex={groupRecordIndex}
          recordIndex={recordIndex}
          isCellSelected={isCellSelected}
          isLastCell={isLastCell}
          isLastFrozenCell={isLastFrozenCell}
          height={isGroupView ? height : height - 1}
          column={column}
          cellMetaData={cellMetaData}
          modifyRecord={this.props.modifyRecord}
          lockRecordViaButton={this.props.lockRecordViaButton}
          modifyRecordViaButton={this.props.modifyRecordViaButton}
          reloadCurrentRecord={this.reloadCurrentRecord}
          highlightClassName={highlightClassName}
          bgColor={bgColor}
        />
      );
    });
  };

  isCellHighlight = (columnKey, rowId) => {
    const { searchResult } = this.props;
    if (searchResult) {
      const matchedColumns = searchResult.matchedRows[rowId];
      if (matchedColumns && matchedColumns.includes(columnKey)) {
        return true;
      }
    }
    return false;
  };

  isCurrentCellHighlight = (columnKey, rowId) => {
    const { searchResult } = this.props;
    if (searchResult) {
      const { currentSelectIndex } = searchResult;
      if (typeof(currentSelectIndex) !== 'number') return false;
      const currentSelectCell = searchResult.matchedCells[currentSelectIndex];
      if (!currentSelectCell) return false;
      if (currentSelectCell.row === rowId && currentSelectCell.column === columnKey) return true;
    }
    return false;
  };

  getColumnCells = () => {
    const {
      columns, colOverScanStartIdx, colOverScanEndIdx, groupRecordIndex, index: recordIndex,
      record, cellMetaData, isGroupView, height, columnColor
    } = this.props;
    const recordId = record._id;
    const rendererColumns = columns.slice(colOverScanStartIdx, colOverScanEndIdx);
    return rendererColumns.map((column) => {
      const { key, frozen } = column;
      const needBindEvents = !frozen;
      const isCellSelected = this.isCellSelected(columns.findIndex(col => col.key === column.key));
      const isCellHighlight = this.isCellHighlight(key, recordId);
      const isCurrentCellHighlight = this.isCurrentCellHighlight(key, recordId);
      const highlightClassName = isCurrentCellHighlight ? 'cell-current-highlight' : isCellHighlight ? 'cell-highlight' : null;
      const isLastCell = this.isLastCell(columns, key);
      const bgColor = columnColor && columnColor[key];
      return (
        <Cell
          key={column.key}
          record={record}
          groupRecordIndex={groupRecordIndex}
          recordIndex={recordIndex}
          isCellSelected={isCellSelected}
          isLastCell={isLastCell}
          height={isGroupView ? height : height - 1}
          column={column}
          needBindEvents={needBindEvents}
          cellMetaData={cellMetaData}
          modifyRecord={this.props.modifyRecord}
          lockRecordViaButton={this.props.lockRecordViaButton}
          modifyRecordViaButton={this.props.modifyRecordViaButton}
          reloadCurrentRecord={this.reloadCurrentRecord}
          highlightClassName={highlightClassName}
          bgColor={bgColor}
        />
      );
    });
  };

  getRecordStyle = () => {
    const { isGroupView, height, isLastRecord } = this.props;
    const style = { height };
    if (isGroupView) {
      const { top, left } = this.props;
      style.top = top;
      style.left = left;
      if (isLastRecord) {
        style.height = height + 1;
      }
    }
    return style;
  };

  getFrozenColumnsStyle = () => {
    const { isGroupView, lastFrozenColumnKey, height } = this.props;
    let style = {
      zIndex: metadataZIndexes.SEQUENCE_COLUMN,
      height: height - 1,
    };
    if (isGroupView) {
      style.height = height;
      style.zIndex = metadataZIndexes.FROZEN_GROUP_CELL;
      if (!lastFrozenColumnKey) {
        style.marginLeft = '0px';
      }
    }
    return style;
  };

  // handle drag copy
  handleDragEnter = (e) => {
    // Prevent default to allow drop
    e.preventDefault();
    const { index, groupRecordIndex, cellMetaData: { onDragEnter } } = this.props;
    onDragEnter({ overRecordIdx: index, overGroupRecordIndex: groupRecordIndex });
  };

  handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  handleDrop = (e) => {
    // The default in Firefox is to treat data in dataTransfer as a URL and perform navigation on it, even if the data type used is 'text'
    // To bypass this, we need to capture and prevent the drop event.
    e.preventDefault();
  };

  render() {
    const {
      isSelected, isGroupView, index, isLastRecord, lastFrozenColumnKey, height, record
    } = this.props;
    const isLocked = record._locked ? true : false;
    const cellHeight = isGroupView ? height : height - 1;

    const frozenCells = this.getFrozenCells();
    const columnCells = this.getColumnCells();

    return (
      <div
        className={classnames('sf-metadata-result-table-row', {
          'sf-metadata-last-table-row': isLastRecord,
          'row-selected': isSelected,
          'row-locked': isLocked
        })}
        style={this.getRecordStyle()}
        onDragEnter={this.handleDragEnter}
        onDragOver={this.handleDragOver}
        onDrop={this.handleDrop}
      >
        {/* frozen */}
        <div
          className="frozen-columns d-flex"
          style={this.getFrozenColumnsStyle()}
          ref={ref => this.frozenColumns = ref}
        >
          <ActionsCell
            isLocked={isLocked}
            isSelected={isSelected}
            recordId={record._id}
            index={index}
            onSelectRecord={this.onSelectRecord}
            isLastFrozenCell={!lastFrozenColumnKey}
            height={cellHeight}
          />
          {frozenCells}
        </div>
        {/* scroll */}
        {columnCells}
      </div>
    );
  }
}

Record.propTypes = {
  hasSelectedCell: PropTypes.bool,
  isGroupView: PropTypes.bool,
  isSelected: PropTypes.bool,
  groupRecordIndex: PropTypes.number,
  index: PropTypes.number.isRequired,
  isLastRecord: PropTypes.bool,
  lastFrozenColumnKey: PropTypes.string,
  cellMetaData: PropTypes.object,
  selectedPosition: PropTypes.object,
  record: PropTypes.object.isRequired,
  columns: PropTypes.array.isRequired,
  colOverScanStartIdx: PropTypes.number,
  colOverScanEndIdx: PropTypes.number,
  scrollLeft: PropTypes.number,
  top: PropTypes.number,
  left: PropTypes.number,
  height: PropTypes.number,
  selectNoneCells: PropTypes.func,
  onSelectRecord: PropTypes.func,
  modifyRecord: PropTypes.func,
  lockRecordViaButton: PropTypes.func,
  modifyRecordViaButton: PropTypes.func,
  reloadRecords: PropTypes.func,
  searchResult: PropTypes.object,
  columnColor: PropTypes.object,
};

export default Record;
