import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import RecordsHeader from './records-header';
import RecordsBody from './records-body';
import RecordsGroupBody from './records-group-body';
import RecordsFooter from './record-footer';
import { HorizontalScrollbar } from '../../../scrollbar';
import { recalculate } from '../../../../utils/column-utils';
import { SEQUENCE_COLUMN_WIDTH, CANVAS_RIGHT_INTERVAL, GROUP_ROW_TYPE, EVENT_BUS_TYPE } from '../../../../constants';
import {
  isWindowsBrowser, isWebkitBrowser, isMobile, getEventClassName,
  addClassName, removeClassName,
} from '../../../../utils';
import RecordMetrics from '../../../../utils/record-metrics';
import { isShiftKeyDown } from '../../../../utils/keyboard-utils';
import { getVisibleBoundaries } from '../../../../utils/viewport';
import { getColOverScanEndIdx, getColOverScanStartIdx } from '../../../../utils/grid';
import { setColumnOffsets } from '../../../../utils/column-utils';

class Records extends Component {

  constructor(props) {
    super(props);
    this.scrollTop = 0;
    this.isScrollByScrollbar = false;
    const scrollLeft = window.sfMetadataContext.localStorage.getItem('scroll_left');
    this.scrollLeft = scrollLeft ? Number(scrollLeft) : 0;
    this.lastScrollLeft = this.scrollLeft;
    this.initPosition = { idx: -1, rowIdx: -1, groupRecordIndex: -1 };
    const columnMetrics = this.createColumnMetrics(props);
    const initHorizontalScrollState = this.getHorizontalScrollState({ gridWidth: props.tableContentWidth, columnMetrics, scrollLeft: 0 });
    this.state = {
      columnMetrics,
      recordMetrics: this.createRowMetrics(),
      lastRowIdxUiSelected: { groupRecordIndex: -1, recordIndex: -1 },
      touchStartPosition: {},
      selectedRange: {
        topLeft: this.initPosition,
        bottomRight: this.initPosition,
      },
      ...initHorizontalScrollState,
    };
    this.isWindows = isWindowsBrowser();
    this.isWebkit = isWebkitBrowser();
  }

  componentDidMount() {
    window.addEventListener('popstate', this.onPopState);
    document.addEventListener('copy', this.onCopyCells);
    document.addEventListener('paste', this.onPasteCells);
    if (window.isMobile) {
      window.addEventListener('touchstart', this.onTouchStart);
      window.addEventListener('touchend', this.onTouchEnd);
    } else {
      document.addEventListener('mousedown', this.onMouseDown);
    }
    this.unsubscribeSelectNone = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.SELECT_NONE, this.selectNone);
    this.getScrollPosition();
    this.checkExpandRow();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { columns, tableContentWidth } = nextProps;
    if (
      this.props.columns !== columns
    ) {
      const columnMetrics = this.createColumnMetrics(nextProps);
      this.updateHorizontalScrollState({
        columnMetrics,
        scrollLeft: this.lastScrollLeft,
        gridWidth: tableContentWidth,
      });
      this.setState({ columnMetrics });
    } else if (this.props.tableContentWidth !== tableContentWidth) {
      this.updateHorizontalScrollState({
        columnMetrics: this.state.columnMetrics,
        scrollLeft: this.lastScrollLeft,
        gridWidth: tableContentWidth,
      });
    }

  }

  componentWillUnmount() {
    window.removeEventListener('popstate', this.onPopState);
    document.removeEventListener('copy', this.onCopyCells);
    document.removeEventListener('paste', this.onPasteCells);
    if (window.isMobile) {
      window.removeEventListener('touchstart', this.onTouchStart);
      window.removeEventListener('touchend', this.onTouchEnd);
    } else {
      document.removeEventListener('mousedown', this.onMouseDown);
    }

    this.clearSetAbsoluteTimer();
    this.setState = (state, callback) => {
      return;
    };
  }

  createColumnMetrics = (props) => {
    const { columns, table } = props;
    return recalculate(columns, [], table._id);
  };

  createRowMetrics = (props = this.props) => {
    return {
      idSelectedRecordMap: {},
    };
  };

  setScrollLeft = (scrollLeft) => {
    this.resultContainerRef.scrollLeft = scrollLeft;
  };

  resizeColumnWidth = (column, width) => {
    if (width < 50) return;
    const { table, columns, } = this.props;
    const newColumn = Object.assign({}, column, { width });
    const index = columns.findIndex(item => item.key === column.key);
    let updateColumns = columns.slice(0);
    updateColumns[index] = newColumn;
    updateColumns = setColumnOffsets(updateColumns);
    const columnMetrics = recalculate(updateColumns, columns, table._id);
    this.setState({ columnMetrics }, () => {
      const oldValue = localStorage.getItem('pages_columns_width');
      let pagesColumnsWidth = {};
      if (oldValue) {
        pagesColumnsWidth = JSON.parse(oldValue);
      }
      const page = window.app.getPage();
      const { id: pageId } = page;
      let pageColumnsWidth = pagesColumnsWidth[pageId] || {};
      const key = `${table._id}-${column.key}`;
      pageColumnsWidth[key] = width;
      const updated = Object.assign({}, pagesColumnsWidth, { [pageId]: pageColumnsWidth });
      localStorage.setItem('pages_columns_width', JSON.stringify(updated));
    });
  };

  getScrollPosition = () => {
    let scrollLeft = window.sfMetadataContext.localStorage.getItem('scroll_left');
    let scrollTop = window.sfMetadataContext.localStorage.getItem('scroll_top');
    if (scrollLeft && scrollTop) {
      if (this.bodyRef) {
        scrollLeft = Number(scrollLeft);
        scrollTop = Number(scrollTop);
        this.bodyRef.setScrollTop(scrollTop);
        this.setScrollLeft(scrollLeft);
        this.handleHorizontalScroll(scrollLeft, scrollTop);
      }
    }
  };

  checkExpandRow = async () => {
    // todo
  };

  storeScrollPosition = () => {
    const scrollTop = this.bodyRef.getScrollTop();
    const scrollLeft = this.getScrollLeft();
    window.sfMetadataContext.localStorage.setItem('scroll_left', scrollLeft);
    this.storeScrollTop(scrollTop);
  };

  storeScrollTop = (scrollTop) => {
    window.sfMetadataContext.localStorage.setItem('_scroll_top', scrollTop);
  };

  onContentScroll = (e) => {
    const { scrollLeft } = e.target;
    const scrollTop = this.bodyRef.getScrollTop();
    const deltaX = this.scrollLeft - scrollLeft;
    const deltaY = this.scrollTop - scrollTop;
    this.scrollLeft = scrollLeft;
    if (deltaY !== 0) {
      this.scrollTop = scrollTop;
    }

    // table horizontal scroll, set first column freeze
    if (deltaY === 0 && (deltaX !== 0 || scrollLeft === 0)) {
      this.handleHorizontalScroll(scrollLeft, scrollTop);
    }
    this.storeScrollPosition();
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.CLOSE_EDITOR);
  };

  handleHorizontalScroll = (scrollLeft, scrollTop) => {
    if (isMobile) {
      this.updateHorizontalScrollState({
        scrollLeft,
        columnMetrics: this.state.columnMetrics,
        gridWidth: this.props.tableContentWidth,
      });
      return;
    }

    // update classnames after scroll
    const originClassName = this.resultContainerRef ? this.resultContainerRef.className : '';
    let newClassName;
    if (scrollLeft > 0) {
      newClassName = addClassName(originClassName, 'horizontal-scroll');
    } else {
      newClassName = removeClassName(originClassName, 'horizontal-scroll');
    }
    if (newClassName !== originClassName && this.resultContainerRef) {
      this.resultContainerRef.className = newClassName;
    }

    this.lastScrollLeft = scrollLeft;

    this.handleFrozenDOMsPosition(scrollLeft, scrollTop);

    this.recordsFooterRef.setSummaryScrollLeft(scrollLeft);
    if (!this.isScrollByScrollbar) {
      this.handleScrollbarScroll(scrollLeft);
    }
    if (this.bodyRef && this.bodyRef.interactionMask) {
      this.bodyRef.setScrollLeft(scrollLeft);
    }

    this.updateHorizontalScrollState({
      scrollLeft,
      columnMetrics: this.state.columnMetrics,
      gridWidth: this.props.tableContentWidth,
    });
  };

  handleFrozenDOMsPosition = (scrollLeft, scrollTop) => {
    const { lastFrozenColumnKey } = this.state.columnMetrics;
    if (this.props.isGroupView && !lastFrozenColumnKey) {
      return; // none-frozen columns under group view
    }

    this.clearSetAbsoluteTimer();
    this.setFixed(scrollLeft, scrollTop);
    this.timer = setTimeout(() => {
      this.setAbsolute(scrollLeft, scrollTop);
    }, 100);
  };

  handleScrollbarScroll = (scrollLeft) => {
    if (!this.horizontalScrollbar) return;
    if (!this.isScrollByScrollbar) {
      this.setHorizontalScrollbarScrollLeft(scrollLeft);
      return;
    }
    this.isScrollByScrollbar = false;
  };

  onHorizontalScrollbarScroll = (scrollLeft) => {
    this.isScrollByScrollbar = true;
    this.setScrollLeft(scrollLeft);
  };

  onHorizontalScrollbarMouseUp = () => {
    this.isScrollByScrollbar = false;
  };

  setHorizontalScrollbarScrollLeft = (scrollLeft) => {
    this.horizontalScrollbar && this.horizontalScrollbar.setScrollLeft(scrollLeft);
  };

  setFixed = (left, top) => {
    this.bodyRef.recordFrozenRefs.forEach(dom => {
      if (!dom) return;
      dom.frozenColumns.style.position = 'fixed';
      dom.frozenColumns.style.marginLeft = '0px';
      dom.frozenColumns.style.marginTop = '-' + top + 'px';
    });

    this.bodyRef.frozenBtnAddRecordRefs.forEach(dom => {
      if (!dom) return;
      dom.frozenColumns.style.position = 'fixed';
      dom.frozenColumns.style.marginLeft = '0px';
      dom.frozenColumns.style.marginTop = '-' + top + 'px';
    });

    if (this.bodyRef.fixFrozenDoms) {
      this.bodyRef.fixFrozenDoms(left, top);
    }
  };

  setAbsolute = (left) => {
    const { isGroupView } = this.props;
    const { lastFrozenColumnKey } = this.state.columnMetrics;
    if (isGroupView && !lastFrozenColumnKey) {
      return;
    }

    this.bodyRef.recordFrozenRefs.forEach(dom => {
      if (!dom) return;
      dom.frozenColumns.style.position = 'absolute';
      dom.frozenColumns.style.marginLeft = left + 'px';
      dom.frozenColumns.style.marginTop = '0px';
    });

    this.bodyRef.frozenBtnAddRecordRefs.forEach(dom => {
      if (!dom) return;
      dom.frozenColumns.style.position = 'absolute';
      dom.frozenColumns.style.marginLeft = left + 'px';
      dom.frozenColumns.style.marginTop = '0px';
    });

    if (this.bodyRef.cancelFixFrozenDOMs) {
      this.bodyRef.cancelFixFrozenDOMs(left);
    }

    if (this.bodyRef && this.bodyRef.interactionMask) {
      this.bodyRef.cancelSetScrollLeft();
    }
  };

  clearSetAbsoluteTimer = () => {
    if (!this.timer) {
      return;
    }
    clearTimeout(this.timer);
    this.timer = null;
  };

  getScrollLeft = () => {
    if (isMobile) {
      return 0;
    }
    return this.scrollLeft || 0;
  };

  getScrollTop = () => {
    if (isMobile) {
      return 0;
    }
    return this.scrollTop || 0;
  };

  setHorizontalScrollbarRef = (ref) => {
    this.horizontalScrollbar = ref;
  };

  setResultContainerRef = (ref) => {
    this.resultContainerRef = ref;
  };

  updateSelectedRange = (selectedRange) => {
    this.setState({ selectedRange });
  };

  onClickContainer = (e) => {
    let classNames = getEventClassName(e);
    if (classNames.includes('sf-metadata-result-content') || classNames.includes('sf-metadata-result-table-content')) {
      window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.CLOSE_EDITOR);
    }
  };

  onCellClick = (cell) => {
    if (cell) {
      const currentPosition = { ...cell };
      this.updateSelectedRange({
        topLeft: currentPosition,
        bottomRight: currentPosition,
      });
    }
    this.onDeselectAllRecords();
  };

  onCellRangeSelectionUpdated = (selectedRange) => {
    this.onCellClick();
    this.updateSelectedRange(selectedRange);
  };

  onPopState = () => {
    this.checkExpandRow();
  };

  onCopyCells = (e) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.COPY_CELLS, e);
  };

  onPasteCells = (e) => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.PASTE_CELLS, e);
  };

  onTouchStart = (e) => {
    const outsideDom = ['canvas', 'group-canvas'];
    if (e.target && outsideDom.includes(e.target.id)) {
      let touchStartPosition = {
        startX: e.changedTouches[0].clientX,
        startY: e.changedTouches[0].clientY,
      };
      this.setState({ touchStartPosition });
    }
  };

  onTouchEnd = (e) => {
    const outsideDom = ['canvas', 'group-canvas'];
    if (e.target && outsideDom.includes(e.target.id)) {
      let { clientX, clientY } = e.changedTouches[0];
      let { touchStartPosition } = this.state;
      if (Math.abs(touchStartPosition.startX - clientX) < 5 && Math.abs(touchStartPosition.startY - clientY) < 5) {
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
      }
    }
  };

  onMouseDown = (e) => {
    const validClassName = getEventClassName(e);
    if (validClassName.indexOf('sf-metadata-result-table-cell') > -1) {
      return;
    }
    const outsideDom = ['canvas', 'group-canvas'];
    if (outsideDom.includes(e.target.id) || validClassName.includes('sf-metadata-result-content')) {
      window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
    }
  };

  selectNone = () => {
    this.setState({
      selectedRange: {
        topLeft: this.initPosition,
        bottomRight: this.initPosition
      },
    });

    // clear selected records
    this.onDeselectAllRecords();
  };

  onSelectRecord = ({ groupRecordIndex, recordIndex }, e) => {
    e.stopPropagation();
    if (isShiftKeyDown(e)) {
      this.selectRecordWithShift({ groupRecordIndex, recordIndex });
      return;
    }
    const { isGroupView } = this.props;
    const { recordMetrics } = this.state;
    const operateRecord = this.props.recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex });
    if (!operateRecord) {
      return;
    }

    const operateRecordId = operateRecord._id;
    if (RecordMetrics.isRecordSelected(operateRecordId, recordMetrics)) {
      this.deselectRecord(operateRecordId);
      this.setState({ lastRowIdxUiSelected: { groupRecordIndex: -1, recordIndex: -1 } });
      return;
    }
    this.selectRecord(operateRecordId);
    this.setState({ lastRowIdxUiSelected: { groupRecordIndex, recordIndex } });
  };

  selectRecordWithShift = ({ groupRecordIndex, recordIndex }) => {
    const { row_ids, isGroupView } = this.props;
    const { lastRowIdxUiSelected, recordMetrics } = this.state;
    let selectedRecordIds = [];
    if (isGroupView) {
      if (!window.sfMetadataBody || !window.sfMetadataBody.getGroupMetrics) {
        return;
      }
      const groupMetrics = window.sfMetadataBody.getGroupMetrics();
      const { groupRows } = groupMetrics;
      const groupRecordIndexes = [groupRecordIndex, lastRowIdxUiSelected.groupRecordIndex].sort((a, b) => a - b);
      for (let i = groupRecordIndexes[0]; i <= groupRecordIndexes[1]; i++) {
        const groupRow = groupRows[i];
        const { type } = groupRow;
        if (type !== GROUP_ROW_TYPE.ROW) {
          continue;
        }
        selectedRecordIds.push(groupRow.rowId);
      }
    } else {
      const operateRecordId = row_ids[recordIndex];
      if (!operateRecordId) {
        return;
      }
      const lastSelectedRecordIndex = lastRowIdxUiSelected.recordIndex;
      if (lastSelectedRecordIndex < 0) {
        this.selectRecord(operateRecordId);
        this.setState({ lastRowIdxUiSelected: { groupRecordIndex: -1, recordIndex } });
        return;
      }
      if (recordIndex === lastSelectedRecordIndex || RecordMetrics.isRecordSelected(operateRecordId, recordMetrics)) {
        this.deselectRecord(operateRecordId);
        this.setState({ lastRowIdxUiSelected: { groupRecordIndex: -1, recordIndex: -1 } });
        return;
      }
      selectedRecordIds = this.getRecordIdsBetweenRange({ start: lastSelectedRecordIndex, end: recordIndex });
    }

    if (selectedRecordIds.length === 0) {
      return;
    }
    this.selectRecordsById(selectedRecordIds);
    this.setState({ lastRowIdxUiSelected: { groupRecordIndex, recordIndex } });
  };

  getRecordIdsBetweenRange = ({ start, end }) => {
    const { row_ids } = this.props;
    const startIndex = Math.min(start, end);
    const endIndex = Math.max(start, end);
    let recordIds = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const recordId = row_ids[i];
      if (recordId) {
        recordIds.push(recordId);
      }
    }
    return recordIds;
  };

  selectRecord = (recordId) => {
    const { recordMetrics } = this.state;
    if (RecordMetrics.isRecordSelected(recordId, recordMetrics)) {
      return;
    }
    let updatedRecordMetrics = { ...recordMetrics };
    RecordMetrics.selectRecord(recordId, updatedRecordMetrics);
    this.setState({
      recordMetrics: updatedRecordMetrics,
    });
  };

  selectRecordsById = (recordIds) => {
    const { recordMetrics } = this.state;
    const unSelectedRecordIds = recordIds.filter(recordId => !RecordMetrics.isRecordSelected(recordId, recordMetrics));
    if (unSelectedRecordIds.length === 0) {
      return;
    }
    let updatedRecordMetrics = { ...recordMetrics };
    RecordMetrics.selectRecordsById(recordIds, updatedRecordMetrics);
    this.setState({
      recordMetrics: updatedRecordMetrics,
    });
  };

  deselectRecord = (recordId) => {
    const { recordMetrics } = this.state;
    if (!RecordMetrics.isRecordSelected(recordId, recordMetrics)) {
      return;
    }
    let updatedRecordMetrics = { ...recordMetrics };
    RecordMetrics.deselectRecord(recordId, updatedRecordMetrics);
    this.setState({
      recordMetrics: updatedRecordMetrics,
    });
  };

  selectAllRecords = () => {
    const { row_ids, isGroupView } = this.props;
    const { recordMetrics } = this.state;
    let updatedRecordMetrics = { ...recordMetrics };
    let selectedRowIds = [];
    if (isGroupView) {
      if (!window.sfMetadataBody || !window.sfMetadataBody.getGroupMetrics) {
        return;
      }
      const groupMetrics = window.sfMetadataBody.getGroupMetrics();
      const { groupRows } = groupMetrics;
      groupRows.forEach(groupRow => {
        const { type } = groupRow;
        if (type !== GROUP_ROW_TYPE.ROW) {
          return;
        }
        selectedRowIds.push(groupRow.rowId);
      });
    } else {
      selectedRowIds = row_ids;
    }
    RecordMetrics.selectRecordsById(selectedRowIds, updatedRecordMetrics);
    this.setState({
      recordMetrics: updatedRecordMetrics,
    });
  };

  onDeselectAllRecords = () => {
    const { recordMetrics } = this.state;
    if (!RecordMetrics.hasSelectedRecords(recordMetrics)) {
      return;
    }
    let updatedRecordMetrics = { ...recordMetrics };
    RecordMetrics.deselectAllRecords(updatedRecordMetrics);
    this.setState({
      recordMetrics: updatedRecordMetrics,
      lastRowIdxUiSelected: { groupRecordIndex: -1, recordIndex: -1 },
    });
  };

  hasSelectedCell = ({ groupRecordIndex, recordIndex }, selectedPosition) => {
    if (!selectedPosition) return false;
    const { isGroupView } = this.props;
    const { groupRecordIndex: selectedGroupRowIndex, rowIdx: selectedRecordIndex } = selectedPosition;
    if (isGroupView) {
      return groupRecordIndex === selectedGroupRowIndex;
    }
    return recordIndex === selectedRecordIndex;
  };

  hasSelectedRecord = () => {
    const { recordMetrics } = this.state;
    if (!RecordMetrics.hasSelectedRecords(recordMetrics)) {
      return false;
    }
    const selectedRecordIds = RecordMetrics.getSelectedIds(recordMetrics);
    const selectedRecords = selectedRecordIds && selectedRecordIds.map(id => this.props.recordGetterById(id)).filter(Boolean);
    return selectedRecords && selectedRecords.length > 0;
  };

  getHorizontalScrollState = ({ gridWidth, columnMetrics, scrollLeft }) => {
    const { columns } = columnMetrics;
    const columnsLength = columns.length;
    const { colVisibleStartIdx, colVisibleEndIdx } = getVisibleBoundaries(columns, scrollLeft, gridWidth);
    const colOverScanStartIdx = getColOverScanStartIdx(colVisibleStartIdx);
    const colOverScanEndIdx = getColOverScanEndIdx(colVisibleEndIdx, columnsLength);
    return {
      colOverScanStartIdx,
      colOverScanEndIdx,
    };
  };

  updateHorizontalScrollState = ({ columnMetrics, gridWidth, scrollLeft }) => {
    const scrollState = this.getHorizontalScrollState({ columnMetrics, gridWidth, scrollLeft });
    this.setState(scrollState);
  };

  cacheDownloadFilesProps = (column, records) => {
    // todo
  };

  downloadColumnAllFiles = (column) => {
    // todo
  };

  openDownloadFilesDialog = () => {
    // todo
  };

  closeDownloadFilesDialog = () => {
    // todo
  };

  renderRecordsBody = ({ containerWidth }) => {
    const { recordMetrics, columnMetrics, colOverScanStartIdx, colOverScanEndIdx } = this.state;
    const {
      columns, allColumns, totalWidth, lastFrozenColumnKey, frozenColumnsWidth,
    } = columnMetrics;
    const commonProps = {
      ...this.props,
      columns, allColumns, totalWidth, lastFrozenColumnKey, frozenColumnsWidth,
      recordMetrics, colOverScanStartIdx, colOverScanEndIdx,
      hasSelectedRecord: this.hasSelectedRecord(),
      getScrollLeft: this.getScrollLeft,
      getScrollTop: this.getScrollTop,
      selectNone: this.selectNone,
      onCellClick: this.onCellClick,
      onCellRangeSelectionUpdated: this.onCellRangeSelectionUpdated,
      onSelectRecord: this.onSelectRecord,
      setRecordsScrollLeft: this.setScrollLeft,
      hasSelectedCell: this.hasSelectedCell,
      cacheScrollTop: this.storeScrollTop,
    };
    if (this.props.isGroupView) {
      return (
        <RecordsGroupBody
          onRef={(ref) => {
            this.bodyRef = ref;
          }}
          {...commonProps}
          groups={this.props.groups}
          groupbys={this.props.groupbys}
          groupOffsetLeft={this.props.groupOffsetLeft}
        />
      );
    }
    return (
      <RecordsBody
        onRef={(ref) => {
          this.bodyRef = ref;
        }}
        {...commonProps}
        recordIds={this.props.recordIds}
      />
    );
  };

  render() {
    const { recordIds, recordsCount, table, isGroupView, groupOffsetLeft } = this.props;
    const { recordMetrics, columnMetrics, selectedRange, colOverScanStartIdx, colOverScanEndIdx } = this.state;
    const { columns, totalWidth, lastFrozenColumnKey } = columnMetrics;
    const containerWidth = totalWidth + SEQUENCE_COLUMN_WIDTH + CANVAS_RIGHT_INTERVAL;
    const hasSelectedRecord = this.hasSelectedRecord();
    const isSelectedAll = RecordMetrics.isSelectedAll(recordIds, recordMetrics);

    return (
      <Fragment>
        <div
          className={`sf-metadata-result-container ${this.isWindows ? 'windows-browser' : ''}`}
          ref={this.setResultContainerRef}
          onScroll={this.onContentScroll}
          onClick={this.onClickContainer}
        >
          <div className="sf-metadata-result-content" style={{ width: containerWidth }}>
            <RecordsHeader
              onRef={(ref) => {
                this.headerFrozenRef = ref;
              }}
              containerWidth={containerWidth}
              table={table}
              columns={columns}
              colOverScanStartIdx={colOverScanStartIdx}
              colOverScanEndIdx={colOverScanEndIdx}
              hasSelectedRecord={hasSelectedRecord}
              isSelectedAll={isSelectedAll}
              isGroupView={isGroupView}
              groupOffsetLeft={groupOffsetLeft}
              lastFrozenColumnKey={lastFrozenColumnKey}
              resizeColumnWidth={this.resizeColumnWidth}
              selectNoneRecords={this.selectNone}
              selectAllRecords={this.selectAllRecords}
              downloadColumnAllFiles={this.downloadColumnAllFiles}
            />
            {this.renderRecordsBody({ containerWidth })}
          </div>
        </div>
        {this.isWindows && this.isWebkit && (
          <HorizontalScrollbar
            ref={this.setHorizontalScrollbarRef}
            innerWidth={totalWidth + CANVAS_RIGHT_INTERVAL}
            onScrollbarScroll={this.onHorizontalScrollbarScroll}
            onScrollbarMouseUp={this.onHorizontalScrollbarMouseUp}
          />
        )}
        <RecordsFooter
          ref={ref => this.recordsFooterRef = ref}
          recordsCount={recordsCount}
          hasMore={this.props.hasMore}
          columns={columns}
          groupOffsetLeft={groupOffsetLeft}
          recordMetrics={recordMetrics}
          selectedRange={selectedRange}
          isGroupView={isGroupView}
          hasSelectedRecord={hasSelectedRecord}
          isLoadingMore={this.props.isLoadingMore}
          recordGetterById={this.props.recordGetterById}
          recordGetterByIndex={this.props.recordGetterByIndex}
          getRecordsSummaries={() => {}}
          clickToLoadMore={this.props.clickToLoadMore}
        />
      </Fragment>
    );
  }
}

Records.propTypes = {
  isGroupView: PropTypes.bool,
  columns: PropTypes.array,
  table: PropTypes.object,
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool,
  groupOffsetLeft: PropTypes.number,
  gridUtils: PropTypes.object,
  recordIds: PropTypes.array,
  row_ids: PropTypes.array,
  recordsCount: PropTypes.number,
  groups: PropTypes.array,
  groupbys: PropTypes.array,
  searchResult: PropTypes.object,
  tableContentWidth: PropTypes.number,
  scrollToLoadMore: PropTypes.func,
  updateRecord: PropTypes.func,
  updateRecords: PropTypes.func,
  recordGetterById: PropTypes.func,
  recordGetterByIndex: PropTypes.func,
  clickToLoadMore: PropTypes.func,
};

export default Records;
