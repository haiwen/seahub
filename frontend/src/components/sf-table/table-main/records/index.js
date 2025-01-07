import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { HorizontalScrollbar } from '../../scrollbar';
import RecordsHeader from '../records-header';
import Body from './body';
import GroupBody from './group-body';
import RecordsFooter from '../records-footer';
import ContextMenu from '../../context-menu';
import RecordMetrics from '../../utils/record-metrics';
import { recalculate } from '../../utils/column';
import { getVisibleBoundaries } from '../../utils/viewport';
import { getColOverScanEndIdx, getColOverScanStartIdx } from '../../utils/grid';
import { isShiftKeyDown } from '../../../../utils/keyboard-utils';
import { isMobile } from '../../../../utils/utils';
import { isWindowsBrowser, isWebkitBrowser, addClassName, removeClassName, getEventClassName } from '../../utils';
import EventBus from '../../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../constants/event-bus-type';
import { CANVAS_RIGHT_INTERVAL } from '../../constants/grid';
import { GROUP_ROW_TYPE } from '../../constants/group';
import { isNumber } from '../../../../utils/number';

class Records extends Component {

  static defaultProps = {
    gridScroll: {
      scroll_left: 0,
      scroll_top: 0,
    },
  };

  constructor(props) {
    super(props);
    this.scrollTop = 0;
    this.isScrollByScrollbar = false;
    const { scroll_left } = this.getNormalizedScroll();
    this.scrollLeft = scroll_left;
    this.lastScrollLeft = this.scrollLeft;
    this.initPosition = { idx: -1, rowIdx: -1, groupRecordIndex: -1 };
    const columnMetrics = this.createColumnMetrics(props);
    const { width: tableContentWidth } = props.getTableContentRect();
    const initHorizontalScrollState = this.getHorizontalScrollState({ gridWidth: tableContentWidth, columnMetrics, scrollLeft: 0 });
    this.state = {
      columnMetrics,
      recordMetrics: this.createRowMetrics(),
      lastRowIdxUiSelected: { groupRecordIndex: -1, recordIndex: -1 },
      touchStartPosition: {},
      selectedRange: {
        topLeft: this.initPosition,
        bottomRight: this.initPosition,
      },
      selectedPosition: this.initPosition,
      ...initHorizontalScrollState,
    };
    this.eventBus = EventBus.getInstance();
    this.isWindows = isWindowsBrowser();
    this.isWebkit = isWebkitBrowser();
    this.deletedRecord = null;
  }

  componentDidMount() {
    document.addEventListener('copy', this.onCopyCells);
    document.addEventListener('paste', this.onPasteCells);
    document.addEventListener('cut', this.onCutCells);
    if (window.isMobile) {
      window.addEventListener('touchstart', this.onTouchStart);
      window.addEventListener('touchend', this.onTouchEnd);
    } else {
      document.addEventListener('mousedown', this.onMouseDown);
    }
    this.unsubscribeSelectNone = this.eventBus.subscribe(EVENT_BUS_TYPE.SELECT_NONE, this.selectNone);
    this.unsubscribeSelectCell = this.eventBus.subscribe(EVENT_BUS_TYPE.SELECT_CELL, this.selectCell);
    this.getScrollPosition();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { columns, getTableContentRect } = nextProps;
    const { width: tableContentWidth } = getTableContentRect();
    if (this.props.columns !== columns) {
      const columnMetrics = this.createColumnMetrics(nextProps);
      this.updateHorizontalScrollState({
        columnMetrics,
        scrollLeft: this.lastScrollLeft,
        gridWidth: tableContentWidth,
      });
      this.setState({ columnMetrics });
    } else if (this.props.getTableContentRect()?.width !== tableContentWidth) {
      this.updateHorizontalScrollState({
        columnMetrics: this.state.columnMetrics,
        scrollLeft: this.lastScrollLeft,
        gridWidth: tableContentWidth,
      });
    }
  }

  componentWillUnmount() {
    document.removeEventListener('copy', this.onCopyCells);
    document.removeEventListener('paste', this.onPasteCells);
    document.removeEventListener('cut', this.onCutCells);
    if (window.isMobile) {
      window.removeEventListener('touchstart', this.onTouchStart);
      window.removeEventListener('touchend', this.onTouchEnd);
    } else {
      document.removeEventListener('mousedown', this.onMouseDown);
    }

    this.clearSetAbsoluteTimer();
    this.unsubscribeSelectNone();
    this.unsubscribeSelectCell();
    this.setState = (state, callback) => {
      return;
    };
  }

  getNormalizedScroll = () => {
    const { scroll_left, scroll_top } = this.props.gridScroll || {};
    return {
      scroll_left: isNumber(scroll_left) ? scroll_left : 0,
      scroll_top: isNumber(scroll_top) ? scroll_top : 0,
    };
  };

  getScrollPosition = () => {
    const { scroll_left, scroll_top } = this.getNormalizedScroll();
    if (this.bodyRef) {
      this.bodyRef.setScrollTop(scroll_top);
      this.setScrollLeft(scroll_left);
      this.handleHorizontalScroll(scroll_left, scroll_top);
    }
  };

  storeScrollPosition = () => {
    if (this.props.storeGridScroll) {
      const scroll_top = this.bodyRef.getScrollTop();
      const scroll_left = this.getScrollLeft();
      this.props.storeGridScroll({ scroll_left, scroll_top });
    }
  };

  createColumnMetrics = (props) => {
    const { columns, tableColumns, sequenceColumnWidth } = props;
    return recalculate(columns, tableColumns, sequenceColumnWidth);
  };

  createRowMetrics = (props = this.props) => {
    return {
      idSelectedRecordMap: {},
    };
  };

  setScrollLeft = (scrollLeft) => {
    this.resultContainerRef.scrollLeft = scrollLeft;
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
    this.eventBus.dispatch(EVENT_BUS_TYPE.CLOSE_EDITOR);
  };

  handleHorizontalScroll = (scrollLeft, scrollTop) => {
    const { width: tableContentWidth } = this.props.getTableContentRect();
    if (isMobile) {
      this.updateHorizontalScrollState({
        scrollLeft,
        columnMetrics: this.state.columnMetrics,
        gridWidth: tableContentWidth,
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

    if (this.recordsFooterRef && this.recordsFooterRef.setSummaryScrollLeft) {
      this.recordsFooterRef.setSummaryScrollLeft(scrollLeft);
    }

    if (!this.isScrollByScrollbar) {
      this.handleScrollbarScroll(scrollLeft);
    }
    if (this.bodyRef && this.bodyRef.interactionMask) {
      this.bodyRef.setScrollLeft(scrollLeft, scrollTop);
    }

    this.updateHorizontalScrollState({
      scrollLeft,
      columnMetrics: this.state.columnMetrics,
      gridWidth: tableContentWidth,
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
    const classNames = getEventClassName(e);
    if (classNames.includes('sf-table-result-content')) {
      this.eventBus.dispatch(EVENT_BUS_TYPE.CLOSE_EDITOR);
    }
  };

  onCellClick = (cell) => {
    if (cell) {
      this.updateSelectedRange({
        topLeft: this.initPosition,
        bottomRight: this.initPosition,
      });
    }
    this.onDeselectAllRecords();
  };

  onCellRangeSelectionUpdated = (selectedRange) => {
    this.onCellClick();
    this.updateSelectedRange(selectedRange);
  };

  onCopyCells = (e) => {
    if (this.props.supportCopy) {
      this.eventBus.dispatch(EVENT_BUS_TYPE.COPY_CELLS, e);
    }
  };

  onPasteCells = (e) => {
    if (this.props.supportPaste) {
      this.eventBus.dispatch(EVENT_BUS_TYPE.PASTE_CELLS, e);
    }
  };

  onCutCells = (e) => {
    if (this.props.supportCut) {
      this.eventBus.dispatch(EVENT_BUS_TYPE.CUT_CELLS, e);
    }
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
        this.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
      }
    }
  };

  onMouseDown = (e) => {
    const validClassName = getEventClassName(e);
    if (validClassName.indexOf('sf-table-cell') > -1) {
      return;
    }
    const outsideDom = ['canvas', 'group-canvas'];
    if (outsideDom.includes(e.target.id) || validClassName.includes('sf-table-result-content')) {
      this.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
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

  selectCell = (cellPosition) => {
    this.setState({ selectedPosition: cellPosition });
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
    const { recordIds, isGroupView } = this.props;
    const { lastRowIdxUiSelected, recordMetrics } = this.state;
    let selectedRecordIds = [];
    if (isGroupView) {
      if (!window.sfTableBody || !window.sfTableBody.getGroupMetrics) {
        return;
      }
      const groupMetrics = window.sfTableBody.getGroupMetrics();
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
      const operateRecordId = recordIds[recordIndex];
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
    const { recordIds: propsRecordIds } = this.props;
    const startIndex = Math.min(start, end);
    const endIndex = Math.max(start, end);
    let recordIds = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const recordId = propsRecordIds[i];
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
    const { recordIds, isGroupView } = this.props;
    const { recordMetrics } = this.state;
    let updatedRecordMetrics = { ...recordMetrics };
    let selectedRowIds = [];
    if (isGroupView) {
      if (!window.sfTableBody || !window.sfTableBody.getGroupMetrics) {
        return;
      }
      const groupMetrics = window.sfTableBody.getGroupMetrics();
      const { groupRows } = groupMetrics;
      groupRows.forEach(groupRow => {
        const { type } = groupRow;
        if (type !== GROUP_ROW_TYPE.ROW) {
          return;
        }
        selectedRowIds.push(groupRow.rowId);
      });
    } else {
      selectedRowIds = recordIds;
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

  checkHasSelectedRecord = () => {
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

  isOutSelectedRange = ({ recordIndex, idx }) => {
    const { selectedRange } = this.state;
    const { topLeft, bottomRight } = selectedRange;
    const { idx: minIdx, rowIdx: minRowIdx } = topLeft;
    const { idx: maxIdx, rowIdx: maxRowIdx } = bottomRight;
    return idx < minIdx || idx > maxIdx || recordIndex < minRowIdx || recordIndex > maxRowIdx;
  };

  onCellContextMenu = (cell) => {
    const { rowIdx: recordIndex, idx, groupRecordIndex } = cell;
    const { isGroupView, recordGetterByIndex } = this.props;
    const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex });

    if (!record) return;
    const { recordMetrics } = this.state;
    const recordId = record._id;
    if (!RecordMetrics.isRecordSelected(recordId, recordMetrics)) {
      this.setState({ recordMetrics: this.createRowMetrics() });
    }

    // select cell when click out of selectRange
    if (this.isOutSelectedRange({ recordIndex, idx })) {
      this.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_CELL, cell, false);
    }
  };

  getContainerWidth = () => {
    const { sequenceColumnWidth, groupOffsetLeft } = this.props;
    const { columnMetrics } = this.state;
    return sequenceColumnWidth + columnMetrics.totalWidth + CANVAS_RIGHT_INTERVAL + groupOffsetLeft;
  };

  getTableCanvasContainerRect = () => {
    return this.resultContainerRef.getBoundingClientRect();
  };

  getRecordsSummaries = () => {};

  renderRecordsBody = ({ containerWidth }) => {
    const { recordMetrics, columnMetrics, colOverScanStartIdx, colOverScanEndIdx } = this.state;
    const { columns, allColumns, totalWidth, lastFrozenColumnKey, frozenColumnsWidth } = columnMetrics;
    const commonProps = {
      ...this.props,
      columns, allColumns, totalWidth, lastFrozenColumnKey, frozenColumnsWidth,
      recordMetrics, colOverScanStartIdx, colOverScanEndIdx,
      contextMenu: (
        <ContextMenu
          {...this.props}
          recordMetrics={recordMetrics}
        />
      ),
      hasSelectedRecord: this.checkHasSelectedRecord(),
      getScrollLeft: this.getScrollLeft,
      getScrollTop: this.getScrollTop,
      selectNone: this.selectNone,
      onCellClick: this.onCellClick,
      onCellRangeSelectionUpdated: this.onCellRangeSelectionUpdated,
      onSelectRecord: this.onSelectRecord,
      setRecordsScrollLeft: this.setScrollLeft,
      storeScrollPosition: this.storeScrollPosition,
      hasSelectedCell: this.hasSelectedCell,
      onCellContextMenu: this.onCellContextMenu,
      getTableCanvasContainerRect: this.getTableCanvasContainerRect,
    };
    if (this.props.isGroupView) {
      return (
        <GroupBody
          onRef={ref => this.bodyRef = ref}
          {...commonProps}
          containerWidth={containerWidth}
          groups={this.props.groups}
          groupbys={this.props.groupbys}
          groupOffsetLeft={this.props.groupOffsetLeft}
        />
      );
    }
    return (
      <Body
        onRef={ref => this.bodyRef = ref}
        {...commonProps}
        recordIds={this.props.recordIds}
      />
    );
  };

  render() {
    const {
      recordIds, recordsCount, showSequenceColumn, sequenceColumnWidth, isGroupView, groupOffsetLeft,
    } = this.props;
    const { recordMetrics, columnMetrics, selectedRange, colOverScanStartIdx, colOverScanEndIdx } = this.state;
    const { columns, totalWidth, lastFrozenColumnKey } = columnMetrics;
    const containerWidth = this.getContainerWidth();
    const hasSelectedRecord = this.checkHasSelectedRecord();
    const isSelectedAll = showSequenceColumn && RecordMetrics.isSelectedAll(recordIds, recordMetrics);

    return (
      <>
        <div
          className={`sf-table-result-container ${this.isWindows ? 'windows-browser' : ''}`}
          ref={this.setResultContainerRef}
          onScroll={this.onContentScroll}
          onClick={this.onClickContainer}
        >
          <div className="sf-table-result-content" style={{ width: containerWidth }}>
            <RecordsHeader
              onRef={(ref) => this.headerFrozenRef = ref}
              containerWidth={containerWidth}
              ColumnDropdownMenu={this.props.ColumnDropdownMenu}
              NewColumnComponent={this.props.NewColumnComponent}
              headerSettings={this.props.headerSettings}
              columnMetrics={columnMetrics}
              colOverScanStartIdx={colOverScanStartIdx}
              colOverScanEndIdx={colOverScanEndIdx}
              hasSelectedRecord={hasSelectedRecord}
              showSequenceColumn={showSequenceColumn}
              sequenceColumnWidth={sequenceColumnWidth}
              isSelectedAll={isSelectedAll}
              isGroupView={isGroupView}
              groupOffsetLeft={groupOffsetLeft}
              lastFrozenColumnKey={lastFrozenColumnKey}
              selectNoneRecords={this.selectNone}
              selectAllRecords={this.selectAllRecords}
              modifyColumnOrder={this.props.modifyColumnOrder}
              modifyColumnWidth={this.props.modifyColumnWidth}
              insertColumn={this.props.insertColumn}
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
        {this.props.showGridFooter &&
          <RecordsFooter
            ref={ref => this.recordsFooterRef = ref}
            recordsCount={recordsCount}
            hasMoreRecords={this.props.hasMoreRecords}
            columns={columns}
            sequenceColumnWidth={sequenceColumnWidth}
            groupOffsetLeft={groupOffsetLeft}
            recordMetrics={recordMetrics}
            selectedRange={selectedRange}
            isGroupView={isGroupView}
            hasSelectedRecord={hasSelectedRecord}
            isLoadingMoreRecords={this.props.isLoadingMoreRecords}
            recordGetterById={this.props.recordGetterById}
            recordGetterByIndex={this.props.recordGetterByIndex}
            getRecordsSummaries={this.getRecordsSummaries}
            loadAll={this.props.loadAll}
          />
        }
      </>
    );
  }
}

Records.propTypes = {
  tableId: PropTypes.string,
  tableColumns: PropTypes.array,
  columns: PropTypes.array,
  columnEditable: PropTypes.bool,
  ColumnDropdownMenu: PropTypes.object,
  NewColumnComponent: PropTypes.object,
  headerSettings: PropTypes.object,
  showSequenceColumn: PropTypes.bool,
  sequenceColumnWidth: PropTypes.number,
  hasMoreRecords: PropTypes.bool,
  isLoadingMoreRecords: PropTypes.bool,
  isGroupView: PropTypes.bool,
  groupOffsetLeft: PropTypes.number,
  recordIds: PropTypes.array,
  recordsCount: PropTypes.number,
  groups: PropTypes.array,
  groupbys: PropTypes.array,
  searchResult: PropTypes.object,
  showGridFooter: PropTypes.bool,
  supportCopy: PropTypes.bool,
  supportCut: PropTypes.bool,
  supportPaste: PropTypes.bool,
  gridScroll: PropTypes.object,
  getTableContentRect: PropTypes.func,
  storeGridScroll: PropTypes.func,
  scrollToLoadMore: PropTypes.func,
  updateRecord: PropTypes.func,
  recordGetterById: PropTypes.func,
  recordGetterByIndex: PropTypes.func,
  loadAll: PropTypes.func,
  insertColumn: PropTypes.func,
  modifyColumnWidth: PropTypes.func,
  modifyColumnOrder: PropTypes.func,
  getUpdateDraggedRecords: PropTypes.func,
  getCopiedRecordsAndColumnsFromRange: PropTypes.func,
  moveRecord: PropTypes.func,
  addFolder: PropTypes.func,
};

export default Records;
