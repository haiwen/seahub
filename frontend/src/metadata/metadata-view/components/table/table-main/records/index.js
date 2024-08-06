import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import RecordsHeader from './records-header';
import Body from './body';
import GroupBody from './group-body';
import RecordsFooter from './record-footer';
import { HorizontalScrollbar } from '../../../scrollbar';
import { recalculate, setColumnOffsets } from '../../../../utils/column-utils';
import { SEQUENCE_COLUMN_WIDTH, CANVAS_RIGHT_INTERVAL, GROUP_ROW_TYPE, EVENT_BUS_TYPE, GROUP_VIEW_OFFSET } from '../../../../constants';
import {
  isWindowsBrowser, isWebkitBrowser, isMobile, getEventClassName,
  addClassName, removeClassName,
} from '../../../../utils';
import RecordMetrics from '../../../../utils/record-metrics';
import { isShiftKeyDown } from '../../../../utils/keyboard-utils';
import { getVisibleBoundaries } from '../../../../utils/viewport';
import { getColOverScanEndIdx, getColOverScanStartIdx } from '../../../../utils/grid';
import { hideMenu, showMenu } from '../../../../../../components/context-menu/actions';
import ContextMenu from '../../../../../../components/context-menu/context-menu';
import TextTranslation from '../../../../../../utils/text-translation';
import { Utils } from '../../../../../../utils/utils';
import { siteRoot } from '../../../../../../utils/constants';

const METADATA_RECORD_CONTEXT_MENU = 'metadata-record-context-menu';

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
    this.isWindows = isWindowsBrowser();
    this.isWebkit = isWebkitBrowser();
    this.baseURI = '';
  }

  componentDidMount() {
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
    return recalculate(columns, table.columns, table._id);
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
    const { columns } = this.props;
    const newColumn = Object.assign({}, column, { width });
    const index = columns.findIndex(item => item.key === column.key);
    let updateColumns = columns.slice(0);
    updateColumns[index] = newColumn;
    updateColumns = setColumnOffsets(updateColumns);
    const columnMetrics = recalculate(updateColumns, columns);
    this.setState({ columnMetrics }, () => {
      const oldValue = window.sfMetadataContext.localStorage.getItem('columns_width') || {};
      window.sfMetadataContext.localStorage.setItem('columns_width', { ...oldValue, [column.key]: width });

    });
  };

  getScrollPosition = () => {
    let scrollLeft = window.sfMetadataContext.localStorage.getItem('scroll_left') + '';
    let scrollTop = window.sfMetadataContext.localStorage.getItem('scroll_top') + '';
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

  storeScrollPosition = () => {
    const scrollTop = this.bodyRef.getScrollTop();
    const scrollLeft = this.getScrollLeft();
    window.sfMetadataContext.localStorage.setItem('scroll_left', scrollLeft);
    this.storeScrollTop(scrollTop);
  };

  storeScrollTop = (scrollTop) => {
    window.sfMetadataContext.localStorage.setItem('scroll_top', scrollTop);
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

    this.recordsFooterRef.setSummaryScrollLeft(scrollLeft);
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
    const { recordIds, isGroupView } = this.props;
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

  onOpenInNewTab = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const { rowIdx } = this.state.selectedPosition;
    const record = this.props.recordGetter(rowIdx);
    const repoID = window.sfMetadataStore.repoId;

    if (record._is_dir) {
      let url;
      if (record._parent_dir === '/') {
        url = this.baseURI + record._parent_dir + record._name;
      } else {
        url = this.baseURI + record._parent_dir + '/' + record._name;
      }
      window.open(url, '_blank');
    } else {
      const url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(record._parent_dir + '/' + record._name);
      window.open(url, '_blank');
    }
  };

  onOpenParentFolder = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const { rowIdx } = this.state.selectedPosition;
    const record = this.props.recordGetter(rowIdx);
    const parentDir = record._parent_dir;
    const url = this.baseURI + parentDir;
    location.href = url;
  };

  onMenuItemClick = (operation, obj, event) => {
    hideMenu();
    switch (operation) {
      case 'Open file in new tab':
        this.onOpenInNewTab(event);
        return;
      case 'Open parent folder':
        this.onOpenParentFolder(event);
        return;
      default:
        return;
    }
  };

  getMenuList = () => {
    const { OPEN_FILE_IN_NEW_TAB, OPEN_PARENT_FOLDER } = TextTranslation;
    return [OPEN_FILE_IN_NEW_TAB, OPEN_PARENT_FOLDER];
  };

  handleContextMenu = (event, id, menuList, currentObject = null) => {
    event.preventDefault();
    event.stopPropagation();

    let x = event.clientX || (event.touches && event.touches[0].pageX);
    let y = event.clientY || (event.touches && event.touches[0].pageY);

    if (this.props.posX) {
      x -= this.props.posX;
    }
    if (this.props.posY) {
      y -= this.props.posY;
    }

    hideMenu();

    this.setState({ activeDirent: currentObject });

    if (menuList.length === 0) {
      return;
    }

    showMenu({
      id: id,
      position: { x, y },
      target: event.target,
      currentObject: currentObject,
      menuList: menuList,
    });
  };

  onFileNameContextMenu = (event, cell) => {
    const record = this.props.recordGetter(cell.rowIdx);
    if (record._is_dir) {
      return;
    }

    this.baseURI = event.target.baseURI;
    this.setState({ selectedPosition: cell });
    this.handleContextMenu(event, METADATA_RECORD_CONTEXT_MENU, this.getMenuList());
  };

  getMenuContainerSize = () => {
    if (this.resultContainerRef) {
      const { offsetWidth: width, offsetHeight: height } = this.resultContainerRef;
      return { width, height };
    }
    return { width: 0, height: 0 };
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
      onFileNameContextMenu: this.onFileNameContextMenu,
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
    const { recordIds, recordsCount, table, isGroupView, groupOffsetLeft, renameColumn, modifyColumnData,
      deleteColumn } = this.props;
    const { recordMetrics, columnMetrics, selectedRange, colOverScanStartIdx, colOverScanEndIdx } = this.state;
    const { columns, totalWidth, lastFrozenColumnKey } = columnMetrics;
    const containerWidth = totalWidth + SEQUENCE_COLUMN_WIDTH + CANVAS_RIGHT_INTERVAL + (isGroupView ? GROUP_VIEW_OFFSET : 0);
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
              onRef={(ref) => this.headerFrozenRef = ref}
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
              renameColumn={renameColumn}
              deleteColumn={deleteColumn}
              modifyColumnData={modifyColumnData}
            />
            {this.renderRecordsBody({ containerWidth })}
          </div>
          <ContextMenu
            id={METADATA_RECORD_CONTEXT_MENU}
            onMenuItemClick={this.onMenuItemClick}
            getMenuContainerSize={this.getMenuContainerSize}
          />
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
          loadAll={this.props.loadAll}
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
  recordsCount: PropTypes.number,
  groups: PropTypes.array,
  groupbys: PropTypes.array,
  searchResult: PropTypes.object,
  getTableContentRect: PropTypes.func,
  scrollToLoadMore: PropTypes.func,
  updateRecord: PropTypes.func,
  updateRecords: PropTypes.func,
  recordGetter: PropTypes.func,
  recordGetterById: PropTypes.func,
  recordGetterByIndex: PropTypes.func,
  loadAll: PropTypes.func,
  renameColumn: PropTypes.func,
  deleteColumn: PropTypes.func,
  modifyColumnData: PropTypes.func,
  getCopiedRecordsAndColumnsFromRange: PropTypes.func,
};

export default Records;
