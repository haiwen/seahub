import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { RightScrollbar } from '../../../scrollbar';
import InteractionMasks from '../../../masks/interaction-masks';
import GroupContainer from './group-container';
import Record from '../record';
import { isShiftKeyDown } from '../../../../../utils/keyboard-utils';
import { RecordMetrics } from '../../../utils/record-metrics';
import { getColumnScrollPosition, getColVisibleEndIdx, getColVisibleStartIdx } from '../../../utils/records-body-utils';
import { addClassName, removeClassName } from '../../../../../utils/dom';
import { createGroupMetrics, getGroupRecordByIndex, isNestedGroupRow } from '../../../utils/group-metrics';
import { checkIsColumnSupportDirectEdit, checkIsColumnFrozen, checkIsNameColumn, getColumnByIndex, checkIsColumnEditable } from '../../../utils/column';
import { checkIsCellSupportOpenEditor } from '../../../utils/selected-cell-utils';
import { GROUP_HEADER_HEIGHT, GROUP_ROW_TYPE, GROUP_VIEW_OFFSET } from '../../../constants/group';
import { EVENT_BUS_TYPE } from '../../../constants/event-bus-type';
import EventBus from '../../../../common/event-bus';

const ROW_HEIGHT = 33;
const GROUP_OVER_SCAN_ROWS = 10;
const MAX_ANIMATION_ROWS = 50;
const LOCAL_FOLDED_GROUP_KEY = 'path_folded_group';
const { max, min } = Math;

class GroupBody extends Component {

  static defaultProps = {
    editorPortalTarget: document.body,
    scrollToRowIndex: 0,
  };

  constructor(props) {
    super(props);
    const { groups, groupbys, allColumns } = props;
    const rowHeight = this.getRowHeight();
    const pathFoldedGroupMap = this.getFoldedGroups();
    const groupMetrics = createGroupMetrics(groups, groupbys, pathFoldedGroupMap, allColumns, rowHeight, false);
    const { startRenderIndex, endRenderIndex } = this.getGroupVisibleBoundaries(window.innerHeight, 0, groupMetrics, rowHeight);
    this.state = {
      isContextMenuShow: false,
      activeRecords: [],
      menuPosition: null,
      groupMetrics,
      startRenderIndex,
      endRenderIndex,
      pathFoldedGroupMap,
      isScrollingRightScrollbar: false,
      selectedPosition: null,
    };
    this.eventBus = EventBus.getInstance();
    this.groupsNode = {};
    this.recordFrozenRefs = [];
    this.rowVisibleStart = startRenderIndex;
    this.rowVisibleEnd = endRenderIndex;
    this.columnVisibleStart = 0;
    this.columnVisibleEnd = this.props.getColumnVisibleEnd();
    this.disabledAnimation = false;
    this.nextPathFoldedGroupMap = null;
  }

  componentDidMount() {
    window.sfTableBody = this;
    window.addEventListener('resize', this.onResize);
    this.props.onRef(this);
    this.unSubscribeCollapseAllGroups = this.eventBus.subscribe(EVENT_BUS_TYPE.COLLAPSE_ALL_GROUPS, this.collapseAllGroups);
    this.unSubscribeExpandAllGroups = this.eventBus.subscribe(EVENT_BUS_TYPE.EXPAND_ALL_GROUPS, this.expandAllGroups);
    this.unsubscribeFocus = this.eventBus.subscribe(EVENT_BUS_TYPE.FOCUS_CANVAS, this.onFocus);
  }

  componentDidUpdate(prevProps) {
    const { groupbys, groups, allColumns, searchResult } = this.props;
    const { scrollTop } = this.resultContentRef;
    const rowHeight = this.getRowHeight();
    if (
      groupbys !== prevProps.groupbys ||
      groups !== prevProps.groups ||
      searchResult !== prevProps.searchResult
    ) {
      const gridHeight = window.innerHeight;
      const { matchedCells } = searchResult || {};
      const pathFoldedGroupMap = Array.isArray(matchedCells) && matchedCells.length > 0 ? {} : this.getFoldedGroups();
      const groupMetrics = createGroupMetrics(groups, groupbys, pathFoldedGroupMap, allColumns, rowHeight, false);
      this.updateScroll({ gridHeight, scrollTop, groupMetrics, rowHeight });
    }
    if (this.disabledAnimation) {
      this.ableRecordsAnimation();
    }
    if (this.expandingGroupPathString) {
      const groupMetrics = createGroupMetrics(groups, groupbys, this.nextPathFoldedGroupMap, allColumns, rowHeight, false);
      this.updateScroll({ scrollTop, groupMetrics, pathFoldedGroupMap: this.nextPathFoldedGroupMap });
      this.expandingGroupPathString = null;
      this.nextPathFoldedGroupMap = null;
    }
  }

  componentWillUnmount() {
    this.storeScrollPosition();
    window.removeEventListener('resize', this.onResize);
    this.unSubscribeCollapseAllGroups();
    this.unSubscribeExpandAllGroups();
    this.unsubscribeFocus();

    this.clearHorizontalScroll();
    this.clearScrollbarTimer();
    window.sfTableBody = null;
    this.setState = (state, callback) => {
      return;
    };
  }

  storeScrollPosition = () => {
    this.props.storeScrollPosition();
  };

  onFocus = () => {
    if (this.interactionMask.container) {
      this.interactionMask.focus();
      return;
    }
    this.resultContentRef.focus();
  };

  getShownRecords = () => {
    const { startRenderIndex, endRenderIndex, groupMetrics } = this.state;
    const visibleGroupRows = this.getVisibleGroupRecords(startRenderIndex, endRenderIndex, groupMetrics.groupRows);
    return visibleGroupRows.map(groupRow => this.props.recordGetterById(groupRow.rowId)).filter(row => !!row);
  };

  getGroupVisibleBoundaries = (gridHeight, scrollTop, groupMetrics, rowHeight) => {
    const { groupRows, groupRowsHeight, maxLevel } = groupMetrics;
    if (!Array.isArray(groupRows) || groupRows.length === 0) {
      return { startRenderIndex: 0, endRenderIndex: 0 };
    }
    let startRenderIndex = 0;
    let endRenderIndex = 0;
    const GROUP_TOP_OFFSET = GROUP_HEADER_HEIGHT * maxLevel + GROUP_OVER_SCAN_ROWS * rowHeight;
    const GROUP_BOTTOM_OFFSET = GROUP_HEADER_HEIGHT * maxLevel + GROUP_OVER_SCAN_ROWS * rowHeight;
    const overScanStartTop = max(0, scrollTop - GROUP_TOP_OFFSET);
    const overScanEndTop = min(groupRowsHeight, scrollTop + gridHeight + GROUP_BOTTOM_OFFSET);
    const groupRowsLen = groupRows.length;
    for (let i = 0; i < groupRowsLen; i++) {
      const groupRow = groupRows[i];
      const { top } = groupRow;
      if (top <= overScanStartTop) {
        startRenderIndex++;
      }
      if (top <= overScanEndTop) {
        endRenderIndex++;
      }
    }
    return { startRenderIndex, endRenderIndex };
  };

  setGroupNode = (groupPathString) => node => {
    this.groupsNode[groupPathString] = node;
  };

  setResultContentRef = (ref) => {
    this.resultContentRef = ref;
  };

  getCanvasClientHeight = () => {
    return (this.resultContentRef && this.resultContentRef.clientHeight) || 0;
  };

  setInteractionMaskRef = (ref) => {
    this.interactionMask = ref;
  };

  setResultRef = (ref) => {
    this.resultRef = ref;
  };

  getRecordsWrapperScrollHeight = () => {
    return (this.resultRef && this.resultRef.scrollHeight) || 0;
  };

  setScrollTop = (scrollTop) => {
    this.resultContentRef.scrollTop = scrollTop;
  };

  setScrollLeft = (scrollLeft, scrollTop) => {
    this.interactionMask && this.interactionMask.setScrollLeft(scrollLeft, scrollTop);
  };

  cancelSetScrollLeft = () => {
    this.interactionMask && this.interactionMask.cancelSetScrollLeft();
  };

  setRightScrollbar = (ref) => {
    this.rightScrollbar = ref;
  };

  getScrollTop = () => {
    return this.resultContentRef ? this.resultContentRef.scrollTop : 0;
  };

  getRowHeight = () => {
    return ROW_HEIGHT;
  };

  getRowTop = (groupRecordIndex) => {
    const { groupMetrics } = this.state;
    const groupRow = getGroupRecordByIndex(groupRecordIndex, groupMetrics);
    if (!groupRow) return 0;
    return groupRow.top || 0;
  };

  jumpToRow = (scrollToGroupRecordIndex) => {
    const { groupMetrics } = this.state;
    const height = this.resultContentRef.offsetHeight;
    const groupRecordTop = this.getRowTop(scrollToGroupRecordIndex);
    const scrollTop = Math.min(groupRecordTop, groupMetrics.groupRowsHeight - height);
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

  getRecordBodyHeight = () => {
    return this.resultContentRef ? this.resultContentRef.offsetHeight : 0;
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
    } else if (mouseX - interval < this.props.sequenceColumnWidth + this.props.frozenColumnsWidth) {
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
    if (this.scrollTimer) return;
    this.scrollTimer = setInterval(() => {
      const scrollLeft = this.props.getScrollLeft();
      this.props.setRecordsScrollLeft(scrollLeft + 20);
    }, 10);
  };

  scrollToLeft = () => {
    if (this.scrollTimer) return;
    this.scrollTimer = setInterval(() => {
      const scrollLeft = this.props.getScrollLeft();
      if (scrollLeft <= 0) {
        this.clearHorizontalScroll();
        return;
      }
      this.props.setRecordsScrollLeft(scrollLeft - 20);
    }, 10);
  };

  clearHorizontalScroll = () => {
    if (!this.scrollTimer) return;
    clearInterval(this.scrollTimer);
    this.scrollTimer = null;
  };

  clearScrollbarTimer = () => {
    if (!this.scrollbarTimer) return;
    clearTimeout(this.scrollbarTimer);
    this.scrollbarTimer = null;
  };

  getCellMetaData = () => {
    if (!this.cellMetaData) {
      this.cellMetaData = {
        CellOperationBtn: this.props.CellOperationBtn,
        onCellClick: this.onCellClick,
        onCellDoubleClick: this.onCellDoubleClick,
        onCellMouseDown: this.onCellMouseDown,
        onCellMouseEnter: this.onCellMouseEnter,
        onCellMouseMove: this.onCellMouseMove,
        onDragEnter: this.handleDragEnter,
        modifyRecord: this.props.modifyRecord,
        onCellContextMenu: this.onCellContextMenu,
      };
    }
    return this.cellMetaData;
  };

  handleDragEnter = ({ overRecordIdx, overGroupRecordIndex }) => {
    this.eventBus.dispatch(EVENT_BUS_TYPE.DRAG_ENTER, { overRecordIdx, overGroupRecordIndex });
  };

  getGroupMetrics = () => {
    return this.state.groupMetrics;
  };

  getGroupRecordByIndex = (groupRecordIndex) => {
    const groupMetrics = this.getGroupMetrics();
    return getGroupRecordByIndex(groupRecordIndex, groupMetrics);
  };

  fixFrozenDoms = (scrollLeft, scrollTop) => {
    if (!checkIsColumnFrozen(this.props.columns[0]) && scrollLeft === 0) {
      return;
    }
    Object.keys(this.groupsNode).forEach((groupIdx) => {
      const groupNode = this.groupsNode[groupIdx];
      if (!groupNode) {
        return;
      }
      groupNode.fixedFrozenDOMs(scrollLeft, scrollTop);
    });
  };

  cancelFixFrozenDOMs = (scrollLeft) => {
    if (!checkIsColumnFrozen(this.props.columns[0]) && scrollLeft === 0) {
      return;
    }
    if (this.groupsNode) {
      Object.keys(this.groupsNode).forEach((groupPathString) => {
        const groupNode = this.groupsNode[groupPathString];
        if (!groupNode) {
          return;
        }
        groupNode.cancelFixFrozenDOMs(scrollLeft);
      });
    }
  };

  onResize = () => {
    const gridHeight = window.innerHeight;
    if (!gridHeight) {
      return;
    }
    const { scrollTop } = this.resultContentRef;
    const rowHeight = this.getRowHeight();
    this.updateScroll({ gridHeight, scrollTop, rowHeight });
  };

  onScroll = () => {
    const { offsetHeight, scrollTop: contentScrollTop } = this.resultContentRef;
    this.oldScrollTop = contentScrollTop;

    this.updateScroll({ scrollTop: contentScrollTop });

    // Scroll to the bottom of the page, load more records
    if (offsetHeight + contentScrollTop >= this.resultContentRef.scrollHeight) {
      if (this.props.scrollToLoadMore) {
        this.props.scrollToLoadMore();
      }
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

  setRightScrollbarScrollTop = (scrollTop) => {
    this.rightScrollbar && this.rightScrollbar.setScrollTop(scrollTop);
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

  onCellClick = (cell, e) => {
    const { selectedPosition } = this.state;
    if (isShiftKeyDown(e)) {
      if (!selectedPosition || selectedPosition.idx === -1) {
        this.selectCell(cell, false);
        return;
      }
      const isFromKeyboard = true;
      this.selectUpdate(cell, isFromKeyboard);
    } else {
      const { columns, recordGetterByIndex, checkCanModifyRecord } = this.props;
      const column = getColumnByIndex(cell.idx, columns);
      const supportOpenEditor = checkIsColumnSupportDirectEdit(column);
      const hasOpenPermission = checkIsCellSupportOpenEditor(cell, column, true, recordGetterByIndex, checkCanModifyRecord);
      this.selectCell(cell, supportOpenEditor && hasOpenPermission);
    }
    this.props.onCellClick(cell);
    this.setState({ selectedPosition: cell });
  };

  onCellDoubleClick = (cell, e) => {
    const { columns, recordGetterByIndex, checkCanModifyRecord } = this.props;
    const column = getColumnByIndex(cell.idx, columns);
    const supportOpenEditor = checkIsColumnEditable(column);
    const hasOpenPermission = checkIsCellSupportOpenEditor(cell, column, true, recordGetterByIndex, checkCanModifyRecord);
    this.selectCell(cell, supportOpenEditor && hasOpenPermission);
  };

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

  onCellContextMenu = (cellPosition) => {
    this.setState({
      selectedPosition: Object.assign({}, this.state.selectedPosition, cellPosition),
    });
    this.props.onCellContextMenu(cellPosition);
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

  selectNoneCells = () => {
    this.interactionMask && this.interactionMask.selectNone();
    const { selectedPosition } = this.state;
    if (!selectedPosition || selectedPosition.idx < 0 || selectedPosition.rowIdx < 0) {
      return;
    }
    this.selectNone();
  };

  selectNone = () => {
    this.setState({ selectedPosition: { idx: -1, rowIdx: -1, groupRecordIndex: -1 } });
  };

  selectCell = (cell, openEditor) => {
    this.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_CELL, cell, openEditor);
  };

  selectStart = (cellPosition) => {
    this.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_START, cellPosition);
  };

  selectUpdate = (cellPosition, isFromKeyboard, callback) => {
    this.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_UPDATE, cellPosition, isFromKeyboard, callback);
  };

  selectEnd = () => {
    this.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_END);
  };

  onCloseContextMenu = () => {
    this.setState({
      isContextMenuShow: false,
      menuPosition: null,
      activeRecords: [],
    });
  };

  getNextScrollState = ({ gridHeight, scrollTop, rowHeight, groupMetrics, pathFoldedGroupMap }) => {
    const _gridHeight = gridHeight || window.innerHeight;
    const _rowHeight = rowHeight || this.getRowHeight();
    const updatedGroupMetrics = groupMetrics || this.state.groupMetrics;
    const updatedPathFoldedGroupMap = pathFoldedGroupMap || this.state.pathFoldedGroupMap;
    const { startRenderIndex, endRenderIndex } = this.getGroupVisibleBoundaries(_gridHeight, scrollTop, updatedGroupMetrics, _rowHeight);
    return {
      startRenderIndex,
      endRenderIndex,
      groupMetrics: updatedGroupMetrics,
      pathFoldedGroupMap: updatedPathFoldedGroupMap,
    };
  };

  updateScroll = (scrollParams) => {
    const { startRenderIndex, endRenderIndex, ...scrollArgs } = scrollParams;
    let nextScrollState = this.getNextScrollState(scrollArgs);
    if (startRenderIndex && endRenderIndex) {
      nextScrollState.startRenderIndex = startRenderIndex;
      nextScrollState.endRenderIndex = endRenderIndex;
    }
    this.setState(nextScrollState);
    return nextScrollState;
  };

  isParentGroupContainer = (currentGroupRow, targetGroupRow) => {
    const { groupPath: currentGroupPath, level: currentGroupLevel, type: currentGroupRowType } = currentGroupRow;
    const { groupPath: targetGroupPath, level: targetGroupLevel } = targetGroupRow;
    return currentGroupRowType === GROUP_ROW_TYPE.GROUP_CONTAINER &&
      currentGroupLevel > targetGroupLevel && currentGroupPath[0] === targetGroupPath[0];
  };

  getPrevGroupContainers = (currentGroupRow, groupRows, maxLevel) => {
    if (!currentGroupRow) {
      return [];
    }
    const { level, groupRecordIndex, type } = currentGroupRow;
    if (groupRecordIndex === 0 || (level === maxLevel && type === GROUP_ROW_TYPE.GROUP_CONTAINER)) {
      return [];
    }
    let prevGroupContainers = [];
    let prevGroupRowIndex = groupRecordIndex - 1;
    while (prevGroupRowIndex > -1) {
      const prevGroupRow = groupRows[prevGroupRowIndex];
      const { type: preGroupRowType, level: prevGroupRowLevel } = prevGroupRow;
      if (preGroupRowType === GROUP_ROW_TYPE.GROUP_CONTAINER) {
        // first level group.
        if (level === maxLevel) {
          prevGroupContainers.push(prevGroupRow);
          break;
        }

        // multiple level group.
        if (this.isParentGroupContainer(prevGroupRow, currentGroupRow)) {
          prevGroupContainers.unshift(prevGroupRow);
        }

        if (prevGroupRowLevel === maxLevel) {
          break;
        }
      }
      prevGroupRowIndex--;
    }
    return prevGroupContainers;
  };

  getVisibleGroupRecords = (startRenderIndex, endRenderIndex, groupRows) => {
    const visibleGroupRows = [];
    const overScanStartGroupRow = groupRows[startRenderIndex];
    const maxLevel = this.props.groupbys.length;

    // If first visible group is nested in the previous group, then the previous group container also needs to be rendered.
    const prevGroupContainers = this.getPrevGroupContainers(overScanStartGroupRow, groupRows, maxLevel);
    visibleGroupRows.push(...prevGroupContainers);
    let i = startRenderIndex;
    let rows = [];
    while (i <= endRenderIndex) {
      let groupRow = groupRows[i];
      if (groupRow && groupRow.visible) {
        visibleGroupRows.push(groupRow);
        if (groupRow.type === GROUP_ROW_TYPE.ROW) {
          rows.push(groupRow);
        }
      }
      i++;
    }
    return visibleGroupRows;
  };

  getFoldedGroups = () => {
    return this.props.foldedGroups || {};
  };

  getVisibleIndex = () => {
    return { rowVisibleStartIdx: this.rowVisibleStart, rowVisibleEndIdx: this.rowVisibleEnd };
  };

  updateFoldedGroups = (pathFoldedGroupMap) => {
    if (this.props.storeFoldedGroups) {
      this.props.storeFoldedGroups(LOCAL_FOLDED_GROUP_KEY, pathFoldedGroupMap);
    }
    this.selectNoneCells();
  };

  collapseAllGroups = () => {
    const { groupMetrics } = this.state;
    const { groupRows } = groupMetrics;
    let pathFoldedGroupMap = {};
    groupRows.forEach(groupRow => {
      const { type, groupPathString } = groupRow;
      if (type !== GROUP_ROW_TYPE.GROUP_CONTAINER) {
        return;
      }
      pathFoldedGroupMap[groupPathString] = true;
    });
    this.updateFoldedGroups(pathFoldedGroupMap);
    const { groups, groupbys, allColumns } = this.props;
    const rowHeight = this.getRowHeight();
    const { scrollTop } = this.resultContentRef;
    const nextGroupMetrics = createGroupMetrics(groups, groupbys, pathFoldedGroupMap, allColumns, rowHeight, false);
    this.updateScroll({ scrollTop, rowHeight, groupMetrics: nextGroupMetrics });
  };

  expandAllGroups = () => {
    const pathFoldedGroupMap = {};
    this.updateFoldedGroups(pathFoldedGroupMap);
    const { groups, groupbys, allColumns } = this.props;
    const { scrollTop } = this.resultContentRef;
    const rowHeight = this.getRowHeight();
    const groupMetrics = createGroupMetrics(groups, groupbys, pathFoldedGroupMap, allColumns, rowHeight, false);
    this.updateScroll({ scrollTop, rowHeight, groupMetrics });
  };

  onExpandGroupToggle = (groupPathString) => {
    const { groupMetrics, pathFoldedGroupMap } = this.state;
    const { groupRows, maxLevel } = groupMetrics;
    const groupContainerRow = groupRows.find(groupRow => groupRow.groupPathString === groupPathString && groupRow.type === GROUP_ROW_TYPE.GROUP_CONTAINER);
    if (!groupContainerRow) return;
    const { groupRecordIndex: operatedGroupRowIndex, groupPath: operatedGroupPath, height: operatedGroupRowHeight, isExpanded } = groupContainerRow;
    let updatedPathFoldedGroupMap = { ...pathFoldedGroupMap };
    if (isExpanded) {
      updatedPathFoldedGroupMap[groupPathString] = true;
    } else {
      delete updatedPathFoldedGroupMap[groupPathString];
    }

    const { groups, groupbys, allColumns } = this.props;
    const { scrollTop } = this.resultContentRef;
    const rowHeight = this.getRowHeight();
    const recalculatedGroupMetrics = createGroupMetrics(groups, groupbys, updatedPathFoldedGroupMap, allColumns, rowHeight, false);

    // expand/fold group directly if the records exceed the maximum number of records supported.
    if (groupContainerRow.count >= MAX_ANIMATION_ROWS) {
      this.forbidRecordsAnimation();
      this.updateFoldedGroups(updatedPathFoldedGroupMap);
      this.updateScroll({ scrollTop, rowHeight, groupMetrics: recalculatedGroupMetrics, pathFoldedGroupMap: updatedPathFoldedGroupMap });
      return;
    }

    const { startRenderIndex, endRenderIndex } = this.getGroupVisibleBoundaries(window.innerHeight, scrollTop, recalculatedGroupMetrics, rowHeight);
    let newGroupMetrics;
    if (isExpanded) {
      newGroupMetrics = groupMetrics;
      let newGroupRows = newGroupMetrics.groupRows;
      if (maxLevel > 1) {
        // update the parent group container.
        const increment = -(operatedGroupRowHeight - GROUP_HEADER_HEIGHT);
        for (let i = operatedGroupRowIndex - 1; i > -1; i--) {
          let updatedGroupRow = newGroupRows[i];
          const updatedGroupPath = updatedGroupRow.groupPath;
          if (this.isParentGroupContainer(updatedGroupRow, groupContainerRow)) {
            updatedGroupRow.height = updatedGroupRow.height + increment;
          }
          if (updatedGroupPath[0] !== operatedGroupPath[0]) {
            break;
          }
        }
      }

      // update the group container/record which nested in the folding group.
      for (let i = operatedGroupRowIndex + 1; i < newGroupRows.length; i++) {
        let updatedGroupRow = newGroupRows[i];
        const updatedGroupPath = updatedGroupRow.groupPath;
        if (isNestedGroupRow(updatedGroupRow, groupContainerRow)) {
          updatedGroupRow.visible = false;
        }
        if (updatedGroupPath[0] !== operatedGroupPath[0]) {
          break;
        }
      }
      newGroupRows[operatedGroupRowIndex] = { ...newGroupRows[operatedGroupRowIndex], isExpanded: false, height: GROUP_HEADER_HEIGHT };
    } else {
      newGroupMetrics = recalculatedGroupMetrics;
      let newGroupRows = newGroupMetrics.groupRows;

      // update the group container/record which nested in the expanding group.
      const newTop = groupContainerRow.top + GROUP_HEADER_HEIGHT;
      for (let i = operatedGroupRowIndex + 1; i < newGroupRows.length; i++) {
        let updatedGroupRow = newGroupRows[i];
        const updatedGroupPath = updatedGroupRow.groupPath;
        if (isNestedGroupRow(updatedGroupRow, groupContainerRow)) {
          updatedGroupRow.height = 0;
          updatedGroupRow.top = newTop;
        }
        if (updatedGroupPath[0] !== operatedGroupPath[0]) {
          break;
        }
      }
    }
    this.expandingGroupPathString = groupPathString;
    this.nextPathFoldedGroupMap = updatedPathFoldedGroupMap;
    this.setState({
      groupMetrics: newGroupMetrics,
      startRenderIndex,
      endRenderIndex,
    });
    this.updateFoldedGroups(updatedPathFoldedGroupMap);
  };

  forbidRecordsAnimation = () => {
    this.disabledAnimation = true;
    const originClassName = this.groupRows.className;
    const newClassName = removeClassName(originClassName, 'animation');
    if (newClassName !== originClassName) {
      this.groupRows.className = newClassName;
    }
  };

  ableRecordsAnimation = () => {
    this.disabledAnimation = false;
    const originClassName = this.groupRows.className;
    const newClassName = addClassName(originClassName, 'animation');
    if (newClassName !== originClassName) {
      this.groupRows.className = newClassName;
    }
  };

  openDownloadFilesDialog = () => {
    const { column, activeRecords } = this.state;
    this.props.cacheDownloadFilesProps(column, activeRecords);
    this.props.openDownloadFilesDialog();
  };

  renderGroups = () => {
    const {
      totalWidth: columnsWidth, containerWidth,
      columns, sequenceColumnWidth, colOverScanStartIdx, colOverScanEndIdx, groupOffsetLeft,
      recordMetrics, summaryConfigs, lastFrozenColumnKey, showCellColoring, columnColors, showSequenceColumn,
    } = this.props;
    this.recordFrozenRefs = [];
    const totalColumnsWidth = columnsWidth + sequenceColumnWidth;
    const { startRenderIndex, endRenderIndex, groupMetrics, selectedPosition } = this.state;
    const { groupRows, maxLevel } = groupMetrics;
    const scrollLeft = this.props.getScrollLeft();
    const cellMetaData = this.getCellMetaData();
    let visibleGroupRows = this.getVisibleGroupRecords(startRenderIndex, endRenderIndex, groupRows);
    const rendererGroups = [];
    const columnsLen = columns.length;
    const lastColumn = columns[columnsLen - 1];
    let groupRowsHeight = groupMetrics.groupRowsHeight;
    visibleGroupRows.forEach(groupRow => {
      let {
        type, level, key, left, top, isExpanded, height, groupPathString, groupRecordIndex,
      } = groupRow;
      if (type === GROUP_ROW_TYPE.GROUP_CONTAINER) {
        const groupWidth = totalColumnsWidth + (level - 1) * 2 * GROUP_VIEW_OFFSET; // columns + group offset
        const folding = this.expandingGroupPathString === groupPathString && !isExpanded;
        const backdropHeight = height + GROUP_VIEW_OFFSET;
        rendererGroups.push(
          <GroupContainer
            key={key}
            ref={this.setGroupNode(groupPathString)}
            groupPathString={groupPathString}
            group={groupRow}
            height={height}
            backdropHeight={backdropHeight}
            width={groupWidth}
            top={top}
            maxLevel={maxLevel}
            groupOffsetLeft={groupOffsetLeft}
            scrollLeft={scrollLeft}
            columns={columns}
            showSequenceColumn={showSequenceColumn}
            sequenceColumnWidth={sequenceColumnWidth}
            summaryConfigs={summaryConfigs}
            isExpanded={isExpanded}
            folding={folding}
            lastFrozenColumnKey={lastFrozenColumnKey}
            onExpandGroupToggle={this.onExpandGroupToggle}
          />
        );
      } else if (type === GROUP_ROW_TYPE.ROW) {
        const { rowId, rowIdx, isLastRow } = groupRow;
        const record = rowId && this.props.recordGetterById(rowId);
        const isSelected = RecordMetrics.isRecordSelected(rowId, recordMetrics);
        const hasSelectedCell = this.props.hasSelectedCell({ groupRecordIndex }, selectedPosition);
        const columnColor = showCellColoring ? columnColors[rowId] : {};
        if (!record) return;
        rendererGroups.push(
          <Record
            isGroupView
            key={rowId || rowIdx}
            ref={ref => {
              this.recordFrozenRefs.push(ref);
            }}
            isSelected={isSelected}
            showSequenceColumn={showSequenceColumn}
            sequenceColumnWidth={sequenceColumnWidth}
            groupRecordIndex={groupRecordIndex}
            index={rowIdx}
            isLastRecord={isLastRow}
            lastFrozenColumnKey={lastFrozenColumnKey}
            record={record}
            columns={columns}
            colOverScanStartIdx={colOverScanStartIdx}
            colOverScanEndIdx={colOverScanEndIdx}
            left={left}
            top={top}
            height={height}
            scrollLeft={scrollLeft}
            cellMetaData={cellMetaData}
            searchResult={this.props.searchResult}
            hasSelectedCell={hasSelectedCell}
            selectedPosition={this.state.selectedPosition}
            selectNoneCells={this.selectNoneCells}
            checkCanModifyRecord={this.props.checkCanModifyRecord}
            checkCellValueChanged={this.props.checkCellValueChanged}
            onSelectRecord={this.props.onSelectRecord}
            modifyRecord={this.props.modifyRecord}
            reloadRecords={this.props.reloadRecords}
            columnColor={columnColor}
          />
        );
      }
    });

    const allColumnsFrozen = lastFrozenColumnKey === lastColumn.key;
    const groupRowsClassName = classnames(
      'canvas-groups-rows', 'animation',
      {
        'single-column': checkIsNameColumn(lastColumn),
        'disabled-add-record': true,
        'all-columns-frozen': allColumnsFrozen,
        'frozen': allColumnsFrozen || !!lastFrozenColumnKey,
      }
    );
    const groupRowsStyle = {
      height: groupRowsHeight,
      width: containerWidth + ((maxLevel - 1) * 2 + 1) * GROUP_VIEW_OFFSET, // columns width + groups offset
    };
    return (
      <div className={groupRowsClassName} style={groupRowsStyle} ref={ref => this.groupRows = ref}>
        {rendererGroups}
      </div>
    );
  };

  render() {
    return (
      <Fragment>
        <div
          id='group-canvas'
          className='sf-table-canvas'
          ref={this.setResultContentRef}
          onScroll={this.onScroll}
          onKeyDown={this.props.onGridKeyDown}
          onKeyUp={this.props.onGridKeyUp}
        >
          <InteractionMasks
            {...this.props}
            isGroupView
            ref={this.setInteractionMaskRef}
            contextMenu={this.props.contextMenu}
            tableId={this.props.tableId}
            columns={this.props.columns}
            recordsCount={this.props.recordsCount}
            recordMetrics={this.props.recordMetrics}
            groups={this.props.groups}
            groupMetrics={this.state.groupMetrics}
            rowHeight={this.getRowHeight()}
            groupOffsetLeft={this.props.groupOffsetLeft}
            scrollTop={this.oldScrollTop}
            getRowTop={this.getRowTop}
            getScrollLeft={this.props.getScrollLeft}
            getTableContentRect={this.props.getTableContentRect}
            getMobileFloatIconStyle={this.props.getMobileFloatIconStyle}
            onToggleMobileMoreOperations={this.props.onToggleMobileMoreOperations}
            onToggleInsertRecordDialog={this.props.onToggleInsertRecordDialog}
            editorPortalTarget={this.props.editorPortalTarget}
            onCellRangeSelectionUpdated={this.onCellRangeSelectionUpdated}
            recordGetterByIndex={this.props.recordGetterByIndex}
            recordGetterById={this.props.recordGetterById}
            editMobileCell={this.props.editMobileCell}
            frozenColumnsWidth={this.props.frozenColumnsWidth}
            selectNone={this.selectNone}
            onCellClick={this.onCellClick}
            getVisibleIndex={this.getVisibleIndex}
            getGroupCanvasScrollTop={this.getScrollTop}
            setGroupCanvasScrollTop={this.setScrollTop}
            scrollToColumn={this.scrollToColumn}
            setRecordsScrollLeft={this.props.setRecordsScrollLeft}
            getUpdateDraggedRecords={this.props.getUpdateDraggedRecords}
            getCopiedRecordsAndColumnsFromRange={this.props.getCopiedRecordsAndColumnsFromRange}
            getTableCanvasContainerRect={this.props.getTableCanvasContainerRect}
          />
          <div className="sf-table-records-wrapper" ref={this.setResultRef}>
            {this.renderGroups()}
          </div>
        </div>
        <RightScrollbar
          ref={this.setRightScrollbar}
          getClientHeight={this.getCanvasClientHeight}
          getScrollHeight={this.getRecordsWrapperScrollHeight}
          onScrollbarScroll={this.onScrollbarScroll}
          onScrollbarMouseUp={this.onScrollbarMouseUp}
        />
      </Fragment>
    );
  }

}

GroupBody.propTypes = {
  tableId: PropTypes.string,
  allColumns: PropTypes.array,
  columns: PropTypes.array,
  colOverScanStartIdx: PropTypes.number,
  colOverScanEndIdx: PropTypes.number,
  totalWidth: PropTypes.number,
  containerWidth: PropTypes.number,
  groups: PropTypes.array,
  groupbys: PropTypes.array,
  foldedGroups: PropTypes.object,
  recordsCount: PropTypes.number,
  recordMetrics: PropTypes.object,
  groupOffsetLeft: PropTypes.number,
  frozenColumnsWidth: PropTypes.number,
  summaryConfigs: PropTypes.object,
  showSequenceColumn: PropTypes.bool,
  sequenceColumnWidth: PropTypes.number,
  hasSelectedRecord: PropTypes.bool,
  lastFrozenColumnKey: PropTypes.string,
  searchResult: PropTypes.object,
  editorPortalTarget: PropTypes.instanceOf(Element),
  onRef: PropTypes.func,
  getColumnVisibleEnd: PropTypes.func,
  getScrollLeft: PropTypes.func,
  setRecordsScrollLeft: PropTypes.func,
  storeScrollPosition: PropTypes.func,
  hasSelectedCell: PropTypes.func,
  scrollToLoadMore: PropTypes.func,
  getTableContentRect: PropTypes.func,
  getMobileFloatIconStyle: PropTypes.func,
  onToggleMobileMoreOperations: PropTypes.func,
  onToggleInsertRecordDialog: PropTypes.func,
  onCellClick: PropTypes.func,
  onCellRangeSelectionUpdated: PropTypes.func,
  modifyRecord: PropTypes.func,
  recordGetterByIndex: PropTypes.func,
  recordGetterById: PropTypes.func,
  paste: PropTypes.func,
  selectNone: PropTypes.func,
  onSelectRecord: PropTypes.func,
  checkCanModifyRecord: PropTypes.func,
  checkCellValueChanged: PropTypes.func,
  expandRow: PropTypes.func,
  onDeleteRecords: PropTypes.func,
  editMobileCell: PropTypes.func,
  reloadRecords: PropTypes.func,
  showCellColoring: PropTypes.bool,
  columnColors: PropTypes.object,
  storeFoldedGroups: PropTypes.func,
  getUpdateDraggedRecords: PropTypes.func,
  getCopiedRecordsAndColumnsFromRange: PropTypes.func,
  openDownloadFilesDialog: PropTypes.func,
  cacheDownloadFilesProps: PropTypes.func,
  onCellContextMenu: PropTypes.func,
  getTableCanvasContainerRect: PropTypes.func,
};

export default GroupBody;
