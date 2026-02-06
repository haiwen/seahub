import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { HorizontalScrollbar } from '../../scrollbar';
import RecordsHeader from '../records-header';
import Body from './body';
import TreeBody from './tree-body';
import GroupBody from './group-body';
import RecordsFooter from '../records-footer';
import ContextMenu from '../../context-menu';
import RecordDragLayer from './record-drag-layer';
import { RecordMetrics } from '../../utils/record-metrics';
import { TreeMetrics } from '../../utils/tree-metrics';
import { recalculate } from '../../utils/column';
import { getVisibleBoundaries } from '../../utils/viewport';
import { getColOverScanEndIdx, getColOverScanStartIdx } from '../../utils/grid';
import { isShiftKeyDown } from '../../../../utils/keyboard-utils';
import { isMobile } from '../../../../utils/utils';
import { addClassName, removeClassName, getEventClassName } from '../../../../utils/dom';
import { isWindowsBrowser, isWebkitBrowser } from '../../utils';
import EventBus from '../../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../constants/event-bus-type';
import { CANVAS_RIGHT_INTERVAL } from '../../constants/grid';
import { GROUP_ROW_TYPE } from '../../constants/group';
import { isNumber } from '../../../../utils/number';
import { getTreeNodeKey } from '../../utils/tree';

class Records extends Component {

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
      draggingRecordSource: null,
      columnMetrics,
      recordMetrics: this.createRowMetrics(),
      treeMetrics: this.createTreeMetrics(),
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
    const { scroll_left, scroll_top } = this.props.gridScroll || { scroll_left: 0, scroll_top: 0 };
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

  createTreeMetrics = (props = this.props) => {
    if (!props.showRecordAsTree) {
      return null;
    }
    return {
      idSelectedNodeMap: {},
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
    this.props.updateSelectedRecordIds([]);
  };

  selectCell = (cellPosition) => {
    this.setState({ selectedPosition: cellPosition });
  };

  handleSelectTreeNode = ({ groupRecordIndex, recordIndex }) => {
    const { treeMetrics } = this.state;
    const node = this.props.getTreeNodeByIndex(recordIndex);
    const nodeKey = getTreeNodeKey(node);
    if (!nodeKey) return;

    if (TreeMetrics.checkIsTreeNodeSelected(nodeKey, treeMetrics)) {
      this.deselectTreeNodeByKey(nodeKey);
      this.setState({ lastRowIdxUiSelected: { groupRecordIndex: -1, recordIndex: -1 } });
      return;
    }
    this.selectTreeNodeByKey(nodeKey);
    this.setState({ lastRowIdxUiSelected: { groupRecordIndex, recordIndex } });
  };

  onSelectRecord = ({ groupRecordIndex, recordIndex }, e) => {
    e.stopPropagation();
    if (isShiftKeyDown(e)) {
      this.selectRecordWithShift({ groupRecordIndex, recordIndex });
      return;
    }

    const { isGroupView, showRecordAsTree } = this.props;
    const { recordMetrics } = this.state;
    if (showRecordAsTree) {
      this.handleSelectTreeNode({ groupRecordIndex, recordIndex });
      return;
    }

    const operateRecord = this.props.recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex });
    if (!operateRecord) return;

    const operateRecordId = operateRecord._id;
    if (RecordMetrics.isRecordSelected(operateRecordId, recordMetrics)) {
      this.deselectRecordById(operateRecordId);
      this.setState({ lastRowIdxUiSelected: { groupRecordIndex: -1, recordIndex: -1 } });
      return;
    }
    this.selectRecordById(operateRecordId);
    this.setState({ lastRowIdxUiSelected: { groupRecordIndex, recordIndex } });
  };

  getTreeNodesKeysBetweenRange = ({ start, end }) => {
    const startIndex = Math.min(start, end);
    const endIndex = Math.max(start, end);
    let nodeKeys = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const node = this.props.getTreeNodeByIndex(i);
      const nodeKey = getTreeNodeKey(node);
      if (nodeKey) {
        nodeKeys.push(nodeKey);
      }
    }
    return nodeKeys;
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

  selectTreeNodesWithShift = ({ groupRecordIndex, recordIndex }) => {
    const { lastRowIdxUiSelected, treeMetrics } = this.state;
    const node = this.props.getTreeNodeByIndex(recordIndex);
    const nodeKey = getTreeNodeKey(node);
    if (!nodeKey) return;

    const lastSelectedRecordIndex = lastRowIdxUiSelected.recordIndex;
    if (lastSelectedRecordIndex < 0) {
      this.selectTreeNodeByKey(nodeKey);
      this.setState({ lastRowIdxUiSelected: { groupRecordIndex: -1, recordIndex } });
      return;
    }
    if (recordIndex === lastSelectedRecordIndex || TreeMetrics.checkIsTreeNodeSelected(nodeKey, treeMetrics)) {
      this.deselectTreeNodeByKey(nodeKey);
      this.setState({ lastRowIdxUiSelected: { groupRecordIndex: -1, recordIndex: -1 } });
      return;
    }
    const nodesKeys = this.getTreeNodesKeysBetweenRange({ start: lastSelectedRecordIndex, end: recordIndex });
    if (nodesKeys.length === 0) {
      return;
    }
    this.selectTreeNodesByKeys(nodesKeys);
    this.setState({ lastRowIdxUiSelected: { groupRecordIndex, recordIndex } });
  };

  selectRecordWithShift = ({ groupRecordIndex, recordIndex }) => {
    const { recordIds, isGroupView, showRecordAsTree } = this.props;
    if (showRecordAsTree) {
      this.selectTreeNodesWithShift({ groupRecordIndex, recordIndex });
      return;
    }

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
        this.selectRecordById(operateRecordId);
        this.setState({ lastRowIdxUiSelected: { groupRecordIndex: -1, recordIndex } });
        return;
      }
      if (recordIndex === lastSelectedRecordIndex || RecordMetrics.isRecordSelected(operateRecordId, recordMetrics)) {
        this.deselectRecordById(operateRecordId);
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

  selectRecordById = (recordId) => {
    const { recordMetrics } = this.state;
    if (RecordMetrics.isRecordSelected(recordId, recordMetrics)) {
      return;
    }
    let updatedRecordMetrics = { ...recordMetrics };
    RecordMetrics.selectRecord(recordId, updatedRecordMetrics);

    if (this.props.updateSelectedRecordIds) {
      this.props.updateSelectedRecordIds(RecordMetrics.getSelectedIds(updatedRecordMetrics));
    }

    this.setState({ recordMetrics: updatedRecordMetrics });
  };

  selectRecordsById = (recordIds) => {
    const { recordMetrics } = this.state;
    const unSelectedRecordIds = recordIds.filter(recordId => !RecordMetrics.isRecordSelected(recordId, recordMetrics));
    if (unSelectedRecordIds.length === 0) {
      return;
    }
    let updatedRecordMetrics = { ...recordMetrics };
    RecordMetrics.selectRecordsById(recordIds, updatedRecordMetrics);

    if (this.props.updateSelectedRecordIds) {
      this.props.updateSelectedRecordIds(RecordMetrics.getSelectedIds(updatedRecordMetrics));
    }

    this.setState({ recordMetrics: updatedRecordMetrics });
  };

  deselectRecordById = (recordId) => {
    const { recordMetrics } = this.state;
    if (!RecordMetrics.isRecordSelected(recordId, recordMetrics)) {
      return;
    }
    let updatedRecordMetrics = { ...recordMetrics };
    RecordMetrics.deselectRecord(recordId, updatedRecordMetrics);
    if (this.props.updateSelectedRecordIds) {
      this.props.updateSelectedRecordIds(RecordMetrics.getSelectedIds(updatedRecordMetrics));
    }
    this.setState({ recordMetrics: updatedRecordMetrics });
  };

  selectTreeNodesByKeys = (nodesKeys) => {
    const { treeMetrics } = this.state;
    let updatedTreeMetrics = { ...treeMetrics };
    TreeMetrics.selectTreeNodesByKeys(nodesKeys, updatedTreeMetrics);
    this.props.updateSelectedRecordIds(TreeMetrics.getSelectedIds(updatedTreeMetrics, this.props.treeNodeKeyRecordIdMap));
    this.setState({ treeMetrics: updatedTreeMetrics });
  };

  selectTreeNodeByKey = (nodeKey) => {
    const { treeMetrics } = this.state;
    if (TreeMetrics.checkIsTreeNodeSelected(nodeKey, treeMetrics)) {
      return;
    }

    let updatedTreeMetrics = { ...treeMetrics };
    TreeMetrics.selectTreeNode(nodeKey, updatedTreeMetrics);
    this.props.updateSelectedRecordIds(TreeMetrics.getSelectedIds(updatedTreeMetrics, this.props.treeNodeKeyRecordIdMap));
    this.setState({ treeMetrics: updatedTreeMetrics });
  };

  deselectTreeNodeByKey = (nodeKey) => {
    const { treeMetrics } = this.state;
    if (!TreeMetrics.checkIsTreeNodeSelected(nodeKey, treeMetrics)) {
      return;
    }
    let updatedTreeMetrics = { ...treeMetrics };
    TreeMetrics.deselectTreeNode(nodeKey, updatedTreeMetrics);
    this.props.updateSelectedRecordIds(TreeMetrics.getSelectedIds(updatedTreeMetrics, this.props.treeNodeKeyRecordIdMap));
    this.setState({ treeMetrics: updatedTreeMetrics });
  };

  selectAllTreeNodes = () => {
    const { recordsTree } = this.props;
    const { treeMetrics } = this.state;
    let updatedTreeMetrics = { ...treeMetrics };
    const allNodesKeys = recordsTree.map((node) => getTreeNodeKey(node)).filter(Boolean);
    TreeMetrics.selectTreeNodesByKeys(allNodesKeys, updatedTreeMetrics);
    this.props.updateSelectedRecordIds(TreeMetrics.getSelectedIds(updatedTreeMetrics, this.props.treeNodeKeyRecordIdMap));
    this.setState({ recordMetrics: updatedTreeMetrics });
  };

  selectAllRecords = () => {
    const { recordIds, isGroupView, showRecordAsTree } = this.props;
    const { recordMetrics } = this.state;
    if (showRecordAsTree) {
      this.selectAllTreeNodes();
      return;
    }

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
    if (this.props.updateSelectedRecordIds) {
      this.props.updateSelectedRecordIds(RecordMetrics.getSelectedIds(updatedRecordMetrics));
    }
    this.setState({ recordMetrics: updatedRecordMetrics });
  };

  deselectAllTreeNodes = () => {
    const { treeMetrics } = this.state;
    if (!TreeMetrics.checkHasSelectedTreeNodes(treeMetrics)) {
      return;
    }
    let updatedTreeMetrics = { ...treeMetrics };
    TreeMetrics.deselectAllTreeNodes(updatedTreeMetrics);
    this.setState({
      treeMetrics: updatedTreeMetrics,
      lastRowIdxUiSelected: { groupRecordIndex: -1, recordIndex: -1 },
    });
  };

  onDeselectAllRecords = () => {
    const { recordMetrics } = this.state;
    if (this.props.showRecordAsTree) {
      this.deselectAllTreeNodes();
      return;
    }

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
    const { showSequenceColumn, showRecordAsTree, treeNodeKeyRecordIdMap } = this.props;
    const { recordMetrics, treeMetrics } = this.state;
    if (!showSequenceColumn) {
      return false;
    }

    let selectedRecordIds = [];
    if (showRecordAsTree) {
      if (!TreeMetrics.checkHasSelectedTreeNodes(treeMetrics)) {
        return false;
      }
      selectedRecordIds = TreeMetrics.getSelectedIds(treeMetrics, treeNodeKeyRecordIdMap);
    } else {
      if (!RecordMetrics.hasSelectedRecords(recordMetrics)) {
        return false;
      }
      selectedRecordIds = RecordMetrics.getSelectedIds(recordMetrics);
    }

    const selectedRecords = selectedRecordIds.map(id => this.props.recordGetterById(id)).filter(Boolean);
    return selectedRecords.length > 0;
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
    const { isGroupView, recordGetterByIndex, showRecordAsTree } = this.props;
    const { recordMetrics, treeMetrics } = this.state;
    const { rowIdx: recordIndex, idx, groupRecordIndex } = cell;

    if (showRecordAsTree) {
      const node = this.props.getTreeNodeByIndex(recordIndex);
      const nodeKey = getTreeNodeKey(node);
      if (!nodeKey) return;

      if (!TreeMetrics.checkIsTreeNodeSelected(nodeKey, treeMetrics)) {
        this.setState({ treeMetrics: this.createTreeMetrics() });
      }
    } else {
      const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex });
      if (!record) return;

      const recordId = record._id;
      if (!RecordMetrics.isRecordSelected(recordId, recordMetrics)) {
        this.setState({ recordMetrics: this.createRowMetrics() });
      }
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

  checkIsSelectAll = () => {
    const {
      recordIds, showSequenceColumn, showRecordAsTree, recordsTree,
    } = this.props;
    const { recordMetrics, treeMetrics } = this.state;
    if (!showSequenceColumn) {
      return false;
    }
    if (showRecordAsTree) {
      const allNodesKeys = recordsTree.map((node) => getTreeNodeKey(node)).filter(Boolean);
      return TreeMetrics.checkIsSelectedAll(allNodesKeys, treeMetrics);
    }
    return RecordMetrics.isSelectedAll(recordIds, recordMetrics);
  };

  getColumnVisibleEnd = () => {
    const { columnMetrics } = this.state;
    const { columns } = columnMetrics;
    const { width: tableContentWidth } = this.props.getTableContentRect();
    let columnVisibleEnd = 0;
    const contentScrollLeft = this.getScrollLeft();
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

  handleDragRecordsEnd = () => {
    this.setState({ draggingRecordSource: null });
  };

  handleDragRecordStart = (event, { draggingRecordId, draggingTreeNodeKey }) => {
    this.setState({
      draggingRecordSource: {
        event,
        draggingRecordId,
        draggingTreeNodeKey
      }
    });
  };

  handleDropRecords = ({ dropRecordId, dropTreeNodeKey } = {}) => {
    const { showRecordAsTree } = this.props;
    const { draggingRecordSource, treeMetrics, recordMetrics } = this.state;
    const dropTarget = showRecordAsTree ? dropTreeNodeKey : dropRecordId;
    if (!dropTarget) return;

    const { draggingRecordId, draggingTreeNodeKey } = draggingRecordSource;
    const draggingSource = showRecordAsTree ? TreeMetrics.getDraggedTreeNodesKeys(draggingTreeNodeKey, treeMetrics) : RecordMetrics.getDraggedRecordsIds(draggingRecordId, recordMetrics);
    this.props.moveRecords({ draggingSource, dropTarget });
    this.handleDragRecordsEnd();
  };

  getRecordDragDropEvents = () => {
    if (!this.props.moveRecords) return null;
    if (!this.recordDragDropEvents) {
      this.recordDragDropEvents = {
        onDragStart: this.handleDragRecordStart,
        onDrop: this.handleDropRecords,
        onDragEnd: this.handleDragRecordsEnd,
      };
    }
    return this.recordDragDropEvents;
  };

  createRecordsDragLayer = () => {
    const { draggingRecordSource, recordMetrics, treeMetrics } = this.state;
    if (!draggingRecordSource) return null;
    return (
      <RecordDragLayer
        showRecordAsTree={this.props.showRecordAsTree}
        draggingRecordSource={draggingRecordSource}
        recordMetrics={recordMetrics}
        treeMetrics={treeMetrics}
        renderCustomDraggedRows={this.props.renderCustomDraggedRows}
      />
    );
  };

  renderRecordsBody = ({ containerWidth, recordDraggable }) => {
    const { recordMetrics, columnMetrics, colOverScanStartIdx, colOverScanEndIdx, draggingRecordSource } = this.state;
    const { columns, allColumns, totalWidth, lastFrozenColumnKey, frozenColumnsWidth } = columnMetrics;
    const recordDragDropEvents = this.getRecordDragDropEvents();
    const commonProps = {
      ...this.props,
      columns, allColumns, totalWidth, lastFrozenColumnKey, frozenColumnsWidth,
      recordMetrics, colOverScanStartIdx, colOverScanEndIdx, recordDraggable, recordDragDropEvents, draggingRecordSource,
      contextMenu: (
        <ContextMenu
          {...this.props}
          recordMetrics={recordMetrics}
        />
      ),
      hasSelectedRecord: this.checkHasSelectedRecord(),
      getColumnVisibleEnd: this.getColumnVisibleEnd,
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
    if (this.props.showRecordAsTree) {
      return (
        <TreeBody
          onRef={ref => this.bodyRef = ref}
          {...commonProps}
          recordsTree={this.props.recordsTree}
          treeMetrics={this.state.treeMetrics}
          storeFoldedTreeNodes={this.props.storeFoldedTreeNodes}
        />
      );
    }
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
      recordsCount, showSequenceColumn, sequenceColumnWidth, isGroupView, groupOffsetLeft,
    } = this.props;
    const { recordMetrics, columnMetrics, selectedRange, colOverScanStartIdx, colOverScanEndIdx } = this.state;
    const { columns, totalWidth, lastFrozenColumnKey } = columnMetrics;
    const containerWidth = this.getContainerWidth();
    const hasSelectedRecord = this.checkHasSelectedRecord();
    const isSelectedAll = this.checkIsSelectAll();
    const recordDraggable = !!this.props.moveRecords;

    return (
      <>
        <div
          className={classnames('sf-table-result-container', { 'windows-browser': this.isWindows, 'record-draggable': recordDraggable })}
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
              showRecordAsTree={this.props.showRecordAsTree}
              groupOffsetLeft={groupOffsetLeft}
              lastFrozenColumnKey={lastFrozenColumnKey}
              selectNoneRecords={this.selectNone}
              selectAllRecords={this.selectAllRecords}
              modifyColumnOrder={this.props.modifyColumnOrder}
              modifyColumnWidth={this.props.modifyColumnWidth}
              insertColumn={this.props.insertColumn}
            />
            {this.renderRecordsBody({ containerWidth, recordDraggable })}
          </div>
        </div>
        {this.createRecordsDragLayer()}
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
            showRecordAsTree={this.props.showRecordAsTree}
            treeMetrics={this.state.treeMetrics}
            selectedRange={selectedRange}
            isGroupView={isGroupView}
            hasSelectedRecord={hasSelectedRecord}
            isLoadingMoreRecords={this.props.isLoadingMoreRecords}
            recordGetterById={this.props.recordGetterById}
            recordGetterByIndex={this.props.recordGetterByIndex}
            getRecordsSummaries={this.getRecordsSummaries}
            loadMore={this.props.loadMore}
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
  showRecordAsTree: PropTypes.bool,
  groupOffsetLeft: PropTypes.number,
  recordIds: PropTypes.array,
  recordsCount: PropTypes.number,
  groups: PropTypes.array,
  groupbys: PropTypes.array,
  recordsTree: PropTypes.array,
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
  loadMore: PropTypes.func,
  loadAll: PropTypes.func,
  insertColumn: PropTypes.func,
  modifyColumnWidth: PropTypes.func,
  modifyColumnOrder: PropTypes.func,
  getUpdateDraggedRecords: PropTypes.func,
  getCopiedRecordsAndColumnsFromRange: PropTypes.func,
  moveRecords: PropTypes.func,
  updateSelectedRecordIds: PropTypes.func,
};

export default Records;
