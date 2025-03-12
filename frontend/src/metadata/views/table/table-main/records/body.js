import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import Loading from '../../../../../components/loading';
import { RightScrollbar } from '../../../../components/scrollbar';
import Record from './record';
import InteractionMasks from '../../masks/interaction-masks';
import { EVENT_BUS_TYPE, SEQUENCE_COLUMN_WIDTH } from '../../../../constants';
import { isShiftKeyDown } from '../../../../../utils/keyboard-utils';
import { isColumnSupportDirectEdit, isColumnSupportEdit } from '../../../../utils/column';
import { isSelectedCellSupportOpenEditor } from '../../utils/selected-cell-utils';
import RecordMetrics from '../../utils/record-metrics';
import { getColumnScrollPosition, getColVisibleStartIdx, getColVisibleEndIdx } from '../../utils/records-body-utils';

const ROW_HEIGHT = 33;
const RENDER_MORE_NUMBER = 10;
const CONTENT_HEIGHT = window.innerHeight - 174;
const { max, min, ceil, round } = Math;

class RecordsBody extends Component {

  constructor(props) {
    super(props);
    this.state = {
      startRenderIndex: 0,
      endRenderIndex: this.getInitEndIndex(props),
      activeRecords: [],
      menuPosition: null,
      selectedPosition: null,
      isScrollingRightScrollbar: false,
    };
    this.resultContentRef = null;
    this.resultRef = null;
    this.recordFrozenRefs = [];
    this.rowVisibleStart = 0;
    this.rowVisibleEnd = this.setRecordVisibleEnd();
    this.columnVisibleStart = 0;
    this.columnVisibleEnd = this.setColumnVisibleEnd();
    this.timer = null;
  }

  componentDidMount() {
    this.props.onRef(this);
    window.sfMetadataBody = this;
    this.unsubscribeFocus = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.FOCUS_CANVAS, this.onFocus);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { recordsCount, recordIds } = nextProps;
    if (recordsCount !== this.props.recordsCount || recordIds !== this.props.recordIds) {
      this.recalculateRenderIndex(recordIds);
    }
  }

  componentWillUnmount() {
    this.clearHorizontalScroll();
    this.clearScrollbarTimer();
    this.unsubscribeFocus();

    this.setState = (state, callback) => {
      return;
    };
  }

  onFocus = () => {
    if (this.interactionMask.container) {
      this.interactionMask.focus();
      return;
    }
    this.resultContentRef.focus();
  };

  getVisibleIndex = () => {
    return { rowVisibleStartIdx: this.rowVisibleStart, rowVisibleEndIdx: this.rowVisibleEnd };
  };

  getShownRecords = () => {
    return this.getShownRecordIds().map((id) => this.props.recordGetterById(id));
  };

  setRecordVisibleEnd = () => {
    return max(ceil(CONTENT_HEIGHT / ROW_HEIGHT), 0);
  };

  setColumnVisibleEnd = () => {
    const { columns, getScrollLeft, getTableContentRect } = this.props;
    const { width: tableContentWidth } = getTableContentRect();
    let columnVisibleEnd = 0;
    const contentScrollLeft = getScrollLeft();
    let endColumnWidth = tableContentWidth + contentScrollLeft;
    for (let i = 0; i < columns.length; i++) {
      const { width } = columns[i];
      endColumnWidth = endColumnWidth - width;
      if (endColumnWidth < 0) {
        return columnVisibleEnd = i;
      }
    }
    return columnVisibleEnd;
  };

  recalculateRenderIndex = (recordIds) => {
    const { startRenderIndex, endRenderIndex } = this.state;
    const contentScrollTop = this.resultContentRef.scrollTop;
    const start = Math.max(0, Math.floor(contentScrollTop / ROW_HEIGHT) - RENDER_MORE_NUMBER);
    const { height } = this.props.getTableContentRect();
    const end = Math.min(Math.ceil((contentScrollTop + height) / ROW_HEIGHT) + RENDER_MORE_NUMBER, recordIds.length);
    if (start !== startRenderIndex) {
      this.setState({ startRenderIndex: start });
    }
    if (end !== endRenderIndex) {
      this.setState({ endRenderIndex: end });
    }
  };

  getInitEndIndex = (props) => {
    return Math.min(Math.ceil(window.innerHeight / ROW_HEIGHT) + RENDER_MORE_NUMBER, props.recordsCount);
  };

  getShownRecordIds = () => {
    const { recordIds } = this.props;
    const { startRenderIndex, endRenderIndex } = this.state;
    return recordIds.slice(startRenderIndex, endRenderIndex);
  };

  getRowTop = (rowIdx) => {
    return ROW_HEIGHT * rowIdx;
  };

  getRowHeight = () => {
    return ROW_HEIGHT;
  };

  jumpToRow = (scrollToRowIndex) => {
    const { recordsCount } = this.props;
    const rowHeight = this.getRowHeight();
    const height = this.resultContentRef.offsetHeight;
    const scrollTop = Math.min(scrollToRowIndex * rowHeight, recordsCount * rowHeight - height);
    this.setScrollTop(scrollTop);
  };

  scrollToColumn = (idx) => {
    const { columns, getTableContentRect } = this.props;
    const { width: tableContentWidth } = getTableContentRect();
    const newScrollLeft = getColumnScrollPosition(columns, idx, tableContentWidth);
    if (newScrollLeft !== null) {
      this.props.setRecordsScrollLeft(newScrollLeft);
    }
    this.updateColVisibleIndex(newScrollLeft);
  };

  updateColVisibleIndex = (scrollLeft) => {
    const { columns } = this.props;
    const columnVisibleStart = getColVisibleStartIdx(columns, scrollLeft);
    const columnVisibleEnd = getColVisibleEndIdx(columns, window.innerWidth, scrollLeft);
    this.columnVisibleStart = columnVisibleStart;
    this.columnVisibleEnd = columnVisibleEnd;
  };

  setScrollTop = (scrollTop) => {
    this.resultContentRef.scrollTop = scrollTop;
  };

  setScrollLeft = (scrollLeft, scrollTop) => {
    const { interactionMask } = this;
    interactionMask && interactionMask.setScrollLeft(scrollLeft, scrollTop);
  };

  cancelSetScrollLeft = () => {
    const { interactionMask } = this;
    interactionMask && interactionMask.cancelSetScrollLeft();
  };

  getClientScrollTopOffset = (node) => {
    const rowHeight = this.getRowHeight();
    const scrollVariation = node.scrollTop % rowHeight;
    return scrollVariation > 0 ? rowHeight - scrollVariation : 0;
  };

  onHitBottomCanvas = () => {
    const rowHeight = this.getRowHeight();
    const node = this.resultContentRef;
    node.scrollTop += rowHeight + this.getClientScrollTopOffset(node);
  };

  onHitTopCanvas = () => {
    const rowHeight = this.getRowHeight();
    const node = this.resultContentRef;
    node.scrollTop -= (rowHeight - this.getClientScrollTopOffset(node));
  };

  getScrollTop = () => {
    return this.resultContentRef ? this.resultContentRef.scrollTop : 0;
  };

  getRecordBodyHeight = () => {
    return this.resultContentRef ? this.resultContentRef.offsetHeight : 0;
  };

  onScroll = () => {
    const { recordsCount } = this.props;
    const { startRenderIndex, endRenderIndex } = this.state;
    const { offsetHeight, scrollTop: contentScrollTop } = this.resultContentRef;
    // Calculate the start rendering row index, and end rendering row index
    const start = Math.max(0, Math.floor(contentScrollTop / ROW_HEIGHT) - RENDER_MORE_NUMBER);
    const end = Math.min(Math.ceil((contentScrollTop + this.resultContentRef.offsetHeight) / ROW_HEIGHT) + RENDER_MORE_NUMBER, recordsCount);

    this.oldScrollTop = contentScrollTop;
    const renderedRecordsCount = ceil(this.resultContentRef.offsetHeight / ROW_HEIGHT);
    const newRecordVisibleStart = max(0, round(contentScrollTop / ROW_HEIGHT));
    const newRecordVisibleEnd = min(newRecordVisibleStart + renderedRecordsCount, recordsCount);
    this.rowVisibleStart = newRecordVisibleStart;
    this.rowVisibleEnd = newRecordVisibleEnd;

    this.props.cacheScrollTop(contentScrollTop);

    if (Math.abs(start - startRenderIndex) > 5 || start < 5) {
      this.setState({ startRenderIndex: start });
    }
    if (Math.abs(end - endRenderIndex) > 5 || end > recordsCount - 5) {
      this.setState({ endRenderIndex: end });
    }
    // Scroll to the bottom of the page, load more records
    if (offsetHeight + contentScrollTop >= this.resultContentRef.scrollHeight) {
      this.props.scrollToLoadMore();
    }

    if (!this.isScrollingRightScrollbar) {
      this.setRightScrollbarScrollTop(this.oldScrollTop);
    }

    // solve the bug that the scroll bar disappears when scrolling too fast
    this.clearScrollbarTimer();
    this.scrollbarTimer = setTimeout(() => {
      this.setState({ isScrollingRightScrollbar: false });
    }, 300);
  };

  onScrollbarScroll = (scrollTop) => {
    // solve canvas&rightScrollbar circle scroll problem
    if (this.oldScrollTop === scrollTop) {
      return;
    }
    this.setState({ isScrollingRightScrollbar: true }, () => {
      this.setScrollTop(scrollTop);
    });
  };

  onScrollbarMouseUp = () => {
    this.setState({ isScrollingRightScrollbar: false });
  };

  setRightScrollbarScrollTop = (scrollTop) => {
    this.rightScrollbar && this.rightScrollbar.setScrollTop(scrollTop);
  };

  selectNoneCells = () => {
    this.interactionMask && this.interactionMask.selectNone();
    const { selectedPosition } = this.state;
    if (!selectedPosition || selectedPosition.idx < 0 || selectedPosition.rowIdx < 0) {
      return;
    }
    this.selectNone();
  };

  selectNone = () => {
    this.setState({ selectedPosition: { idx: -1, rowIdx: -1 } });
  };

  selectCell = (cell, openEditor) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_CELL, cell, openEditor);
  };

  selectStart = (cellPosition) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_START, cellPosition);
  };

  selectUpdate = (cellPosition, isFromKeyboard, callback) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_UPDATE, cellPosition, isFromKeyboard, callback);
  };

  selectEnd = () => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_END);
  };

  onCellClick = (cell, e) => {
    const { selectedPosition } = this.state;
    if (isShiftKeyDown(e)) {
      if (!selectedPosition || selectedPosition.idx === -1) {
        // need select cell first
        this.selectCell(cell, false);
        return;
      }
      const isFromKeyboard = true;
      this.selectUpdate(cell, isFromKeyboard);
    } else {
      const { columns } = this.props;
      const supportOpenEditor = isColumnSupportDirectEdit(cell, columns);
      const hasOpenPermission = isSelectedCellSupportOpenEditor(cell, columns, false, this.props.recordGetterByIndex);
      this.selectCell(cell, supportOpenEditor && hasOpenPermission);
    }
    this.props.onCellClick(cell);
    this.setState({ selectedPosition: cell });
  };

  onCellDoubleClick = (cell, e) => {
    const { columns } = this.props;
    const supportOpenEditor = isColumnSupportEdit(cell, columns);
    const hasOpenPermission = isSelectedCellSupportOpenEditor(cell, columns, false, this.props.recordGetterByIndex);
    this.selectCell(cell, supportOpenEditor && hasOpenPermission);
  };

  // onRangeSelectStart
  onCellMouseDown = (cellPosition, event) => {
    if (!isShiftKeyDown(event)) {
      this.selectCell(cellPosition);
      this.selectStart(cellPosition);
      window.addEventListener('mouseup', this.onWindowMouseUp);
    }
  };

  // onRangeSelectUpdate
  onCellMouseEnter = (cellPosition) => {
    this.selectUpdate(cellPosition, false, this.updateViewableArea);
  };

  onCellMouseMove = (cellPosition) => {
    this.selectUpdate(cellPosition, false, this.updateViewableArea);
  };

  onWindowMouseUp = (event) => {
    window.removeEventListener('mouseup', this.onWindowMouseUp);
    if (isShiftKeyDown(event)) return;
    this.selectEnd();
    this.clearHorizontalScroll();
  };

  onCellRangeSelectionUpdated = (selectedRange) => {
    this.props.onCellRangeSelectionUpdated(selectedRange);
  };

  onCellContextMenu = (cellPosition) => {
    this.setState({ selectedPosition: cellPosition });
    this.props.onCellContextMenu(cellPosition);
  };

  /**
   * When updating the selection by moving the mouse, you need to automatically scroll to expand the visible area
   * @param {object} selectedRange
   */
  updateViewableArea = (selectedRange) => {
    const { mousePosition } = selectedRange.cursorCell;
    const { x: mouseX, y: mouseY } = mousePosition;
    const tableHeaderHeight = 50 + 48 + 32;
    const interval = 100;
    const step = 8;

    // cursor is at right boundary
    if (mouseX + interval > window.innerWidth) {
      this.scrollToRight();
    } else if (mouseX - interval < SEQUENCE_COLUMN_WIDTH + this.props.frozenColumnsWidth) {
      // cursor is at left boundary
      this.scrollToLeft();
    } else if (mouseY + interval > window.innerHeight - tableHeaderHeight) {
      // cursor is at bottom boundary
      const scrollTop = this.getScrollTop();
      this.resultContentRef.scrollTop = scrollTop + step;
      this.clearHorizontalScroll();
    } else if (mouseY - interval < tableHeaderHeight) {
      // cursor is at top boundary
      const scrollTop = this.getScrollTop();
      if (scrollTop - 16 >= 0) {
        this.resultContentRef.scrollTop = scrollTop - step;
      }
      this.clearHorizontalScroll();
    } else {
      // cursor is at middle area
      this.clearHorizontalScroll();
    }
  };

  scrollToRight = () => {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const scrollLeft = this.props.getScrollLeft();
      this.props.setRecordsScrollLeft(scrollLeft + 20);
    }, 10);
  };

  scrollToLeft = () => {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const scrollLeft = this.props.getScrollLeft();
      if (scrollLeft <= 0) {
        this.clearHorizontalScroll();
        return;
      }
      this.props.setRecordsScrollLeft(scrollLeft - 20);
    }, 10);
  };

  clearHorizontalScroll = () => {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  };

  clearScrollbarTimer = () => {
    if (!this.scrollbarTimer) return;
    clearTimeout(this.scrollbarTimer);
    this.scrollbarTimer = null;
  };

  getCellMetaData = () => {
    if (this.cellMetaData) {
      return this.cellMetaData;
    }
    this.cellMetaData = {
      onCellClick: this.onCellClick,
      onCellDoubleClick: this.onCellDoubleClick,
      onCellMouseDown: this.onCellMouseDown,
      onCellMouseEnter: this.onCellMouseEnter,
      onCellMouseMove: this.onCellMouseMove,
      onDragEnter: this.handleDragEnter,
      modifyRecord: this.props.modifyRecord,
      onCellContextMenu: this.onCellContextMenu
    };
    return this.cellMetaData;
  };

  handleDragEnter = ({ overRecordIdx, overGroupRecordIndex }) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.DRAG_ENTER, { overRecordIdx, overGroupRecordIndex });
  };

  setRightScrollbar = (ref) => {
    this.rightScrollbar = ref;
  };

  setInteractionMaskRef = (ref) => {
    this.interactionMask = ref;
  };

  setResultRef = (ref) => {
    this.resultRef = ref;
  };

  setResultContentRef = (ref) => {
    this.resultContentRef = ref;
  };

  renderRecords = () => {
    this.recordFrozenRefs = [];
    const {
      recordsCount, columns, colOverScanStartIdx, colOverScanEndIdx, lastFrozenColumnKey,
      recordMetrics, showCellColoring, columnColors
    } = this.props;
    const { startRenderIndex, endRenderIndex, selectedPosition } = this.state;
    const cellMetaData = this.getCellMetaData();
    const lastRecordIndex = recordsCount - 1;
    const shownRecordIds = this.getShownRecordIds();
    const scrollLeft = this.props.getScrollLeft();
    const rowHeight = this.getRowHeight();
    let shownRecords = shownRecordIds.map((recordId, index) => {
      const record = this.props.recordGetterById(recordId);
      const isSelected = RecordMetrics.isRecordSelected(recordId, recordMetrics);
      const recordIndex = startRenderIndex + index;
      const isLastRecord = lastRecordIndex === recordIndex;
      const hasSelectedCell = this.props.hasSelectedCell({ recordIndex }, selectedPosition);
      const columnColor = showCellColoring ? columnColors[recordId] : {};
      return (
        <Record
          key={recordId || recordIndex}
          ref={ref => {
            this.recordFrozenRefs.push(ref);
          }}
          isSelected={isSelected}
          index={recordIndex}
          isLastRecord={isLastRecord}
          record={record}
          columns={columns}
          colOverScanStartIdx={colOverScanStartIdx}
          colOverScanEndIdx={colOverScanEndIdx}
          lastFrozenColumnKey={lastFrozenColumnKey}
          scrollLeft={scrollLeft}
          height={rowHeight}
          cellMetaData={cellMetaData}
          hasSelectedCell={hasSelectedCell}
          selectedPosition={this.state.selectedPosition}
          selectNoneCells={this.selectNoneCells}
          onSelectRecord={this.props.onSelectRecord}
          modifyRecord={this.props.modifyRecord}
          searchResult={this.props.searchResult}
          columnColor={columnColor}
        />
      );
    });

    const upperHeight = startRenderIndex * ROW_HEIGHT;
    const belowHeight = (recordsCount - endRenderIndex) * ROW_HEIGHT;
    // add top placeholder
    if (upperHeight > 0) {
      const style = { height: upperHeight, width: '100%' };
      const upperRow = <div key="upper-placeholder" className="d-flex align-items-end" style={style}><Loading className="sf-metadata-loading-tip center" /></div>;
      shownRecords.unshift(upperRow);
    }
    // add bottom placeholder
    if (belowHeight > 0) {
      const style = { height: belowHeight, width: '100%' };
      const belowRow = <div key="below-placeholder" style={style}><Loading className="sf-metadata-loading-tip center" /></div>;
      shownRecords.push(belowRow);
    }

    return shownRecords;
  };

  render() {
    const { editorPortalTarget = document.body } = this.props;
    return (
      <Fragment>
        <div
          id="canvas"
          className="sf-metadata-result-table-content"
          ref={this.setResultContentRef}
          onScroll={this.onScroll}
          onKeyDown={this.props.onGridKeyDown}
          onKeyUp={this.props.onGridKeyUp}
        >
          <InteractionMasks
            ref={this.setInteractionMaskRef}
            contextMenu={this.props.contextMenu}
            canAddRow={this.props.canAddRow}
            table={this.props.table}
            columns={this.props.columns}
            recordsCount={this.props.recordsCount}
            recordMetrics={this.props.recordMetrics}
            rowHeight={this.getRowHeight()}
            getRowTop={this.getRowTop}
            scrollTop={this.oldScrollTop}
            getScrollLeft={this.props.getScrollLeft}
            getTableContentRect={this.props.getTableContentRect}
            getMobileFloatIconStyle={this.props.getMobileFloatIconStyle}
            onToggleMobileMoreOperations={this.props.onToggleMobileMoreOperations}
            editorPortalTarget={editorPortalTarget}
            onCellRangeSelectionUpdated={this.onCellRangeSelectionUpdated}
            modifyRecord={this.props.modifyRecord}
            recordGetterByIndex={this.props.recordGetterByIndex}
            recordGetterById={this.props.recordGetterById}
            modifyRecords={this.props.modifyRecords}
            paste={this.props.paste}
            editMobileCell={this.props.editMobileCell}
            frozenColumnsWidth={this.props.frozenColumnsWidth}
            selectNone={this.selectNone}
            getVisibleIndex={this.getVisibleIndex}
            onHitBottomBoundary={this.onHitBottomCanvas}
            onHitTopBoundary={this.onHitTopCanvas}
            onCellClick={this.onCellClick}
            scrollToColumn={this.scrollToColumn}
            setRecordsScrollLeft={this.props.setRecordsScrollLeft}
            gridUtils={this.props.gridUtils}
            getCopiedRecordsAndColumnsFromRange={this.props.getCopiedRecordsAndColumnsFromRange}
            modifyColumnData={this.props.modifyColumnData}
            getTableCanvasContainerRect={this.props.getTableCanvasContainerRect}
            updateFileTags={this.props.updateFileTags}
            deleteRecords={this.props.deleteRecords}
            moveRecord={this.props.moveRecord}
          />
          <div className="sf-metadata-result-table" style={{ width: this.props.totalWidth + SEQUENCE_COLUMN_WIDTH }} ref={this.setResultRef}>
            {this.renderRecords()}
          </div>
        </div>
        <RightScrollbar
          table={this.props.table}
          ref={this.setRightScrollbar}
          onScrollbarScroll={this.onScrollbarScroll}
          onScrollbarMouseUp={this.onScrollbarMouseUp}
        />
      </Fragment>
    );
  }
}

RecordsBody.propTypes = {
  onRef: PropTypes.func,
  contextMenu: PropTypes.oneOfType([PropTypes.node, PropTypes.element]),
  canAddRow: PropTypes.bool,
  gridUtils: PropTypes.object,
  table: PropTypes.object,
  recordIds: PropTypes.array,
  recordsCount: PropTypes.number,
  columns: PropTypes.array.isRequired,
  colOverScanStartIdx: PropTypes.number,
  colOverScanEndIdx: PropTypes.number,
  lastFrozenColumnKey: PropTypes.string,
  hasSelectedRecord: PropTypes.bool,
  recordMetrics: PropTypes.object,
  totalWidth: PropTypes.number,
  getScrollLeft: PropTypes.func,
  setRecordsScrollLeft: PropTypes.func,
  hasSelectedCell: PropTypes.func,
  cacheScrollTop: PropTypes.func,
  scrollToLoadMore: PropTypes.func,
  getTableContentRect: PropTypes.func,
  getMobileFloatIconStyle: PropTypes.func,
  onToggleMobileMoreOperations: PropTypes.func,
  onToggleInsertRecordDialog: PropTypes.func,
  lockRecordViaButton: PropTypes.func,
  modifyRecordViaButton: PropTypes.func,
  editorPortalTarget: PropTypes.instanceOf(Element),
  recordGetterByIndex: PropTypes.func,
  recordGetterById: PropTypes.func,
  modifyRecord: PropTypes.func.isRequired,
  selectNone: PropTypes.func,
  onCellClick: PropTypes.func,
  onCellRangeSelectionUpdated: PropTypes.func,
  onSelectRecord: PropTypes.func,
  modifyRecords: PropTypes.func.isRequired,
  deleteRecordsLinks: PropTypes.func,
  paste: PropTypes.func,
  searchResult: PropTypes.object,
  scrollToRowIndex: PropTypes.number,
  frozenColumnsWidth: PropTypes.number,
  editMobileCell: PropTypes.func,
  reloadRecords: PropTypes.func,
  appPage: PropTypes.object,
  showCellColoring: PropTypes.bool,
  columnColors: PropTypes.object,
  onFillingDragRows: PropTypes.func,
  getCopiedRecordsAndColumnsFromRange: PropTypes.func,
  openDownloadFilesDialog: PropTypes.func,
  cacheDownloadFilesProps: PropTypes.func,
  onCellContextMenu: PropTypes.func,
  getTableCanvasContainerRect: PropTypes.func,
  moveRecord: PropTypes.func,
  addFolder: PropTypes.func,
};

export default RecordsBody;
