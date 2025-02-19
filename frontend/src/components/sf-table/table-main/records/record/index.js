import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Cell from './cell';
import ActionsCell from './actions-cell';
import { getFrozenColumns } from '../../../utils/column';
import { SEQUENCE_COLUMN as Z_INDEX_SEQUENCE_COLUMN, FROZEN_GROUP_CELL as Z_INDEX_FROZEN_GROUP_CELL } from '../../../constants/z-index';

import './index.css';

class Record extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      canDropTip: false,
    };
  }

  componentDidMount() {
    this.checkScroll();
  }

  shouldComponentUpdate(nextProps, nextState) {
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
      nextProps.showSequenceColumn !== this.props.showSequenceColumn ||
      nextProps.sequenceColumnWidth !== this.props.sequenceColumnWidth ||
      nextProps.colOverScanStartIdx !== this.props.colOverScanStartIdx ||
      nextProps.colOverScanEndIdx !== this.props.colOverScanEndIdx ||
      nextProps.record !== this.props.record ||
      nextProps.top !== this.props.top ||
      nextProps.left !== this.props.left ||
      nextProps.height !== this.props.height ||
      nextProps.searchResult !== this.props.searchResult ||
      nextProps.columnColor !== this.props.columnColor ||
      nextProps.showRecordAsTree !== this.props.showRecordAsTree ||
      nextProps.treeNodeIndex !== this.props.treeNodeIndex ||
      nextProps.treeNodeKey !== this.props.treeNodeKey ||
      nextProps.treeNodeDepth !== this.props.treeNodeDepth ||
      nextProps.hasChildNodes !== this.props.hasChildNodes ||
      nextProps.isFoldedTreeNode !== this.props.isFoldedTreeNode ||
      nextState.canDropTip !== this.state.canDropTip
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

  checkIsCellSelected = (columnIdx) => {
    const { hasSelectedCell, selectedPosition } = this.props;
    if (!selectedPosition) return false;
    return hasSelectedCell && selectedPosition.idx === columnIdx;
  };

  checkIsLastCell(columns, columnKey) {
    return columns[columns.length - 1].key === columnKey;
  }

  reloadCurrentRecord = () => {
    this.props.reloadRecords([this.props.record._id]);
  };

  getFrozenCells = () => {
    const {
      columns, sequenceColumnWidth, lastFrozenColumnKey, groupRecordIndex, index: recordIndex, record,
      cellMetaData, isGroupView, height, columnColor, treeNodeKey,
    } = this.props;
    const frozenColumns = getFrozenColumns(columns);
    if (frozenColumns.length === 0) return null;
    const recordId = record._id;
    return frozenColumns.map((column, index) => {
      const { key } = column;
      const isCellHighlight = this.checkIsCellHighlight(key, recordId, treeNodeKey);
      const isCurrentCellHighlight = this.checkIsCurrentCellHighlight(key, recordId, treeNodeKey);
      const highlightClassName = isCurrentCellHighlight ? 'cell-current-highlight' : isCellHighlight ? 'cell-highlight' : null;
      const isCellSelected = this.checkIsCellSelected(index);
      const isLastCell = this.checkIsLastCell(columns, key);
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
          sequenceColumnWidth={sequenceColumnWidth}
          cellMetaData={cellMetaData}
          checkCanModifyRecord={this.props.checkCanModifyRecord}
          checkCellValueChanged={this.props.checkCellValueChanged}
          reloadCurrentRecord={this.reloadCurrentRecord}
          highlightClassName={highlightClassName}
          bgColor={bgColor}
          showRecordAsTree={this.props.showRecordAsTree}
          treeNodeIndex={this.props.treeNodeIndex}
          treeNodeDepth={this.props.treeNodeDepth}
          hasChildNodes={this.props.hasChildNodes}
          isFoldedTreeNode={this.props.isFoldedTreeNode}
          toggleExpandTreeNode={this.props.toggleExpandTreeNode}
        />
      );
    });
  };

  checkIsCellHighlight = (columnKey, rowId, treeNodeKey) => {
    const { searchResult } = this.props;
    if (searchResult) {
      const matchedColumns = this.props.showRecordAsTree ? searchResult.matchedRows[treeNodeKey] : searchResult.matchedRows[rowId];
      if (matchedColumns && matchedColumns.includes(columnKey)) {
        return true;
      }
    }
    return false;
  };

  checkIsCurrentCellHighlight = (columnKey, rowId, treeNodeKey) => {
    const { searchResult } = this.props;
    if (searchResult) {
      const { currentSelectIndex } = searchResult;
      if (typeof(currentSelectIndex) !== 'number') return false;
      const currentSelectCell = searchResult.matchedCells[currentSelectIndex];
      if (!currentSelectCell) return false;
      const isCurrentRow = this.props.showRecordAsTree ? currentSelectCell.nodeKey === treeNodeKey : currentSelectCell.row === rowId;
      return isCurrentRow && currentSelectCell.column === columnKey;
    }
    return false;
  };

  getColumnCells = () => {
    const {
      columns, sequenceColumnWidth, colOverScanStartIdx, colOverScanEndIdx, groupRecordIndex, index: recordIndex,
      record, cellMetaData, isGroupView, height, columnColor, treeNodeKey,
    } = this.props;
    const recordId = record._id;
    const rendererColumns = columns.slice(colOverScanStartIdx, colOverScanEndIdx);
    return rendererColumns.map((column) => {
      const { key, frozen } = column;
      const needBindEvents = !frozen;
      const isCellSelected = this.checkIsCellSelected(columns.findIndex(col => col.key === column.key));
      const isCellHighlight = this.checkIsCellHighlight(key, recordId, treeNodeKey);
      const isCurrentCellHighlight = this.checkIsCurrentCellHighlight(key, recordId, treeNodeKey);
      const highlightClassName = isCurrentCellHighlight ? 'cell-current-highlight' : isCellHighlight ? 'cell-highlight' : null;
      const isLastCell = this.checkIsLastCell(columns, key);
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
          sequenceColumnWidth={sequenceColumnWidth}
          needBindEvents={needBindEvents}
          cellMetaData={cellMetaData}
          checkCanModifyRecord={this.props.checkCanModifyRecord}
          checkCellValueChanged={this.props.checkCellValueChanged}
          reloadCurrentRecord={this.reloadCurrentRecord}
          highlightClassName={highlightClassName}
          bgColor={bgColor}
          showRecordAsTree={this.props.showRecordAsTree}
          treeNodeIndex={this.props.treeNodeIndex}
          treeNodeDepth={this.props.treeNodeDepth}
          hasChildNodes={this.props.hasChildNodes}
          isFoldedTreeNode={this.props.isFoldedTreeNode}
          toggleExpandTreeNode={this.props.toggleExpandTreeNode}
        />
      );
    });
  };

  getRecordStyle = () => {
    const { isGroupView, height } = this.props;
    let style = { height };
    if (isGroupView) {
      const { top, left } = this.props;
      style.top = top;
      style.left = left;
    }
    return style;
  };

  getFrozenColumnsStyle = () => {
    const { isGroupView, lastFrozenColumnKey, height } = this.props;
    let style = {
      zIndex: Z_INDEX_SEQUENCE_COLUMN,
      height: height - 1,
    };
    if (isGroupView) {
      style.height = height;
      style.zIndex = Z_INDEX_FROZEN_GROUP_CELL;
      if (!lastFrozenColumnKey) {
        style.marginLeft = '0px';
      }
    }
    return style;
  };

  handleDragStart = (event) => {
    event.stopPropagation();
    if (!this.props.recordDraggable) return;
    const { record, treeNodeKey } = this.props;
    const draggingRecordSource = { draggingRecordId: record._id, draggingTreeNodeKey: treeNodeKey };
    event.dataTransfer.effectAllowed = 'move';
    this.props.recordDragDropEvents.onDragStart(event, draggingRecordSource);
  };

  checkHasDraggedRecord = () => {
    return !!this.props.draggingRecordSource;
  };

  checkOverDraggingRecord = () => {
    const { draggingRecordSource, record, treeNodeKey, showRecordAsTree } = this.props;
    if (!this.checkHasDraggedRecord()) return false;

    const { draggingRecordId, draggingTreeNodeKey } = draggingRecordSource;
    if (showRecordAsTree) {
      return draggingTreeNodeKey === treeNodeKey;
    }
    return draggingRecordId === record._id;
  };

  handleDragEnter = (e) => {
    e.preventDefault();
    if (this.checkHasDraggedRecord() && !this.checkOverDraggingRecord()) {
      this.setState({ canDropTip: true });
    }
  };

  handleDragLeave = (e) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = this.rowRef.getBoundingClientRect();
    if (clientX > left && clientX < left + width && clientY > top && clientY < top + height - 2) return;
    this.setState({ canDropTip: false });
  };

  handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = this.checkHasDraggedRecord() ? 'move' : 'copy';
    if (this.checkHasDraggedRecord() && !this.checkOverDraggingRecord()) {
      this.setState({ canDropTip: true });
    }
  };

  handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ canDropTip: false });
    if (!this.checkHasDraggedRecord() || this.checkOverDraggingRecord()) {
      this.props.recordDragDropEvents.onDragEnd();
      return;
    }
    const { record, treeNodeKey } = this.props;
    const dropTarget = { dropRecordId: record._id, dropTreeNodeKey: treeNodeKey };
    this.props.recordDragDropEvents.onDrop(dropTarget);
  };

  onDragEnd = () => {
    this.props.recordDragDropEvents.onDragEnd();
  };

  render() {
    const {
      isSelected, isGroupView, showSequenceColumn, index, isLastRecord, lastFrozenColumnKey, height, record
    } = this.props;
    const isLocked = record._locked ? true : false;
    const cellHeight = isGroupView ? height : height - 1;

    const frozenCells = this.getFrozenCells();
    const columnCells = this.getColumnCells();

    return (
      <div
        ref={rowRef => this.rowRef = rowRef}
        className={classnames('sf-table-row', {
          'sf-table-last-row': isLastRecord,
          'row-selected': isSelected,
          'row-locked': isLocked,
          'can-drop-tip': this.state.canDropTip,
        })}
        style={this.getRecordStyle()}
        onDragEnter={this.handleDragEnter}
        onDragLeave={this.handleDragLeave}
        onDragOver={this.handleDragOver}
        onDrop={this.handleDrop}
        onDragEnd={this.onDragEnd}
      >
        {/* frozen */}
        <div
          className="frozen-columns d-flex"
          style={this.getFrozenColumnsStyle()}
          ref={ref => this.frozenColumns = ref}
        >
          {showSequenceColumn &&
            <ActionsCell
              isLocked={isLocked}
              isSelected={isSelected}
              recordId={record._id}
              index={index}
              showRecordAsTree={this.props.showRecordAsTree}
              treeNodeIndex={this.props.treeNodeIndex}
              onSelectRecord={this.onSelectRecord}
              isLastFrozenCell={!lastFrozenColumnKey}
              height={cellHeight}
              recordDraggable={this.props.recordDraggable}
              handleDragStart={this.handleDragStart}
            />
          }
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
  showSequenceColumn: PropTypes.bool,
  sequenceColumnWidth: PropTypes.number,
  colOverScanStartIdx: PropTypes.number,
  colOverScanEndIdx: PropTypes.number,
  scrollLeft: PropTypes.number,
  top: PropTypes.number,
  left: PropTypes.number,
  height: PropTypes.number,
  recordDraggable: PropTypes.bool,
  selectNoneCells: PropTypes.func,
  onSelectRecord: PropTypes.func,
  checkCanModifyRecord: PropTypes.func,
  checkCellValueChanged: PropTypes.func,
  reloadRecords: PropTypes.func,
  searchResult: PropTypes.object,
  columnColor: PropTypes.object,
  showRecordAsTree: PropTypes.bool,
  treeNodeIndex: PropTypes.number,
  treeNodeKey: PropTypes.string,
  treeNodeDepth: PropTypes.number,
  hasChildNodes: PropTypes.bool,
  isFoldedTreeNode: PropTypes.bool,
  toggleExpandTreeNode: PropTypes.func,
};

export default Record;
