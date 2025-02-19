import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Loading } from '@seafile/sf-metadata-ui-component';
import { RightScrollbar } from '../../scrollbar';
import InteractionMasks from '../../masks/interaction-masks';
import Record from './record';
import EventBus from '../../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../constants/event-bus-type';
import { checkIsTreeNodeShown, checkTreeNodeHasChildNodes, getTreeNodeId, getTreeNodeKey, getValidKeyTreeNodeFoldedMap } from '../../utils/tree';
import { isShiftKeyDown } from '../../../../utils/keyboard-utils';
import { getColumnScrollPosition, getColVisibleStartIdx, getColVisibleEndIdx } from '../../utils/records-body-utils';
import { checkEditableViaClickCell, checkIsColumnSupportDirectEdit, getColumnByIndex, getColumnIndexByKey } from '../../utils/column';
import { checkIsCellSupportOpenEditor } from '../../utils/selected-cell-utils';
import { LOCAL_KEY_TREE_NODE_FOLDED } from '../../constants/tree';
import { TreeMetrics } from '../../utils/tree-metrics';
import { checkHasSearchResult } from '../../utils/search';

const ROW_HEIGHT = 33;
const RENDER_MORE_NUMBER = 10;
const CONTENT_HEIGHT = window.innerHeight - 174;
const { max, min, ceil, round } = Math;

class TreeBody extends Component {

  static defaultProps = {
    editorPortalTarget: document.body,
    scrollToRowIndex: 0,
  };

  constructor(props) {
    super(props);
    const { recordsTree, treeNodeKeyRecordIdMap, keyTreeNodeFoldedMap } = props;
    const validKeyTreeNodeFoldedMap = getValidKeyTreeNodeFoldedMap(keyTreeNodeFoldedMap, treeNodeKeyRecordIdMap);
    const nodes = this.getShownNodes(recordsTree, validKeyTreeNodeFoldedMap);
    this.state = {
      nodes,
      startRenderIndex: 0,
      endRenderIndex: this.getInitEndIndex(nodes),
      keyNodeFoldedMap: validKeyTreeNodeFoldedMap,
      keyNodeFoldedMapForSearch: {},
      selectedPosition: null,
      isScrollingRightScrollbar: false,
    };
    this.eventBus = EventBus.getInstance();
    this.resultContentRef = null;
    this.resultRef = null;
    this.rowVisibleStart = 0;
    this.rowVisibleEnd = this.setRecordVisibleEnd();
    this.columnVisibleStart = 0;
    this.columnVisibleEnd = this.props.getColumnVisibleEnd();
    this.timer = null;
    this.initFrozenNodesRef();
  }

  componentDidMount() {
    this.props.onRef(this);
    window.sfTableBody = this;
    this.unsubscribeFocus = this.eventBus.subscribe(EVENT_BUS_TYPE.FOCUS_CANVAS, this.onFocus);
    this.unsubscribeSelectColumn = this.eventBus.subscribe(EVENT_BUS_TYPE.SELECT_COLUMN, this.onColumnSelect);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { recordsCount, recordIds, treeNodesCount, recordsTree, searchResult } = nextProps;
    const searchResultChanged = searchResult !== this.props.searchResult;
    if (
      recordsCount !== this.props.recordsCount || recordIds !== this.props.recordIds ||
      treeNodesCount !== this.props.treeNodesCount || recordsTree !== this.props.recordsTree ||
      searchResultChanged
    ) {
      const hasSearchResult = checkHasSearchResult(searchResult);
      const keyNodeFoldedMap = hasSearchResult ? {} : this.state.keyNodeFoldedMap;
      this.recalculateRenderIndex(recordsTree, keyNodeFoldedMap);
      if (searchResultChanged) {
        this.setState({ keyNodeFoldedMapForSearch: {} });
      }
    }
  }

  componentWillUnmount() {
    this.storeScrollPosition();
    this.clearHorizontalScroll();
    this.clearScrollbarTimer();
    this.unsubscribeFocus();
    this.unsubscribeSelectColumn();
    window.sfTableBody = null;
    this.setState = (state, callback) => {
      return;
    };
  }

  initFrozenNodesRef = () => {
    this.recordFrozenRefs = [];
  };

  addFrozenNodeRef = (node) => {
    this.recordFrozenRefs.push(node);
  };

  getShownNodes = (recordsTree, keyNodeFoldedMap) => {
    if (!Array.isArray(recordsTree)) {
      return [];
    }
    let shownNodes = [];
    recordsTree.forEach((node, index) => {
      const nodeId = getTreeNodeId(node);
      const row = this.props.recordGetterById(nodeId);
      const nodeKey = getTreeNodeKey(node);
      if (row && checkIsTreeNodeShown(nodeKey, keyNodeFoldedMap)) {
        shownNodes.push({
          ...node,
          node_index: index,
        });
      }
    });
    return shownNodes;
  };

  getInitEndIndex = (nodes) => {
    if (nodes.length === 0) {
      return 0;
    }
    return Math.min(Math.ceil(window.innerHeight / ROW_HEIGHT) + RENDER_MORE_NUMBER, nodes.length);
  };

  recalculateRenderEndIndex = (nodes) => {
    const { height } = this.props.getTableContentRect();
    const contentScrollTop = this.resultContentRef.scrollTop;
    return Math.min(Math.ceil((contentScrollTop + height) / ROW_HEIGHT) + RENDER_MORE_NUMBER, nodes.length);
  };

  recalculateRenderIndex = (recordsTree, keyNodeFoldedMap) => {
    const { startRenderIndex, endRenderIndex } = this.state;
    const nodes = this.getShownNodes(recordsTree, keyNodeFoldedMap);
    const contentScrollTop = this.resultContentRef.scrollTop;
    const start = Math.max(0, Math.floor(contentScrollTop / ROW_HEIGHT) - RENDER_MORE_NUMBER);
    const end = this.recalculateRenderEndIndex(nodes);
    const updates = { nodes };
    if (start !== startRenderIndex) {
      updates.startRenderIndex = start;
    }
    if (end !== endRenderIndex) {
      updates.endRenderIndex = end;
    }
    this.setState(updates);
  };

  clearScrollbarTimer = () => {
    if (!this.scrollbarTimer) return;
    clearTimeout(this.scrollbarTimer);
    this.scrollbarTimer = null;
  };

  clearHorizontalScroll = () => {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  };

  setResultContentRef = (ref) => {
    this.resultContentRef = ref;
  };

  setResultRef = (ref) => {
    this.resultRef = ref;
  };

  setRightScrollbar = (ref) => {
    this.rightScrollbar = ref;
  };

  setInteractionMaskRef = (ref) => {
    this.interactionMask = ref;
  };

  setRecordVisibleEnd = () => {
    return max(ceil(CONTENT_HEIGHT / ROW_HEIGHT), 0);
  };

  setScrollTop = (scrollTop) => {
    this.resultContentRef.scrollTop = scrollTop;
  };

  setRightScrollbarScrollTop = (scrollTop) => {
    this.rightScrollbar && this.rightScrollbar.setScrollTop(scrollTop);
  };

  setScrollLeft = (scrollLeft, scrollTop) => {
    const { interactionMask } = this;
    interactionMask && interactionMask.setScrollLeft(scrollLeft, scrollTop);
  };

  cancelSetScrollLeft = () => {
    const { interactionMask } = this;
    interactionMask && interactionMask.cancelSetScrollLeft();
  };

  storeScrollPosition = () => {
    this.props.storeScrollPosition();
  };

  getCanvasClientHeight = () => {
    return (this.resultContentRef && this.resultContentRef.clientHeight) || 0;
  };

  getClientScrollTopOffset = (node) => {
    const rowHeight = this.getRowHeight();
    const scrollVariation = node.scrollTop % rowHeight;
    return scrollVariation > 0 ? rowHeight - scrollVariation : 0;
  };

  getRecordsWrapperScrollHeight = () => {
    return (this.resultRef && this.resultRef.scrollHeight) || 0;
  };

  getTreeNodeByIndex = (nodeIndex) => {
    const { nodes } = this.state;
    return nodes[nodeIndex];
  };

  getRowHeight = () => {
    return ROW_HEIGHT;
  };

  getRowTop = (rowIdx) => {
    return ROW_HEIGHT * rowIdx;
  };

  getScrollTop = () => {
    return this.resultContentRef ? this.resultContentRef.scrollTop : 0;
  };

  getVisibleIndex = () => {
    return { rowVisibleStartIdx: this.rowVisibleStart, rowVisibleEndIdx: this.rowVisibleEnd };
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

  onFocus = () => {
    if (this.interactionMask.container) {
      this.interactionMask.focus();
      return;
    }
    this.resultContentRef.focus();
  };

  onColumnSelect = (column) => {
    const { columns } = this.props;
    const selectColumnIndex = getColumnIndexByKey(column.key, columns);
    this.setState({
      selectedPosition: { ...this.state.selectedPosition, idx: selectColumnIndex, rowIdx: 0 },
    });
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

  onScroll = () => {
    const { nodes, startRenderIndex, endRenderIndex } = this.state;
    const { offsetHeight, scrollTop: contentScrollTop } = this.resultContentRef;
    const nodesCount = nodes.length;

    // Calculate the start rendering row index, and end rendering row index
    const start = Math.max(0, Math.floor(contentScrollTop / ROW_HEIGHT) - RENDER_MORE_NUMBER);
    const end = Math.min(Math.ceil((contentScrollTop + this.resultContentRef.offsetHeight) / ROW_HEIGHT) + RENDER_MORE_NUMBER, nodesCount);

    this.oldScrollTop = contentScrollTop;
    const renderedRecordsCount = ceil(this.resultContentRef.offsetHeight / ROW_HEIGHT);
    const newRecordVisibleStart = max(0, round(contentScrollTop / ROW_HEIGHT));
    const newRecordVisibleEnd = min(newRecordVisibleStart + renderedRecordsCount, nodesCount);
    this.rowVisibleStart = newRecordVisibleStart;
    this.rowVisibleEnd = newRecordVisibleEnd;

    if (Math.abs(start - startRenderIndex) > 5 || start < 5) {
      this.setState({ startRenderIndex: start });
    }
    if (Math.abs(end - endRenderIndex) > 5 || end > nodesCount - 5) {
      this.setState({ endRenderIndex: end });
    }
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

  updateColVisibleIndex = (scrollLeft) => {
    const { columns } = this.props;
    const columnVisibleStart = getColVisibleStartIdx(columns, scrollLeft);
    const columnVisibleEnd = getColVisibleEndIdx(columns, window.innerWidth, scrollLeft);
    this.columnVisibleStart = columnVisibleStart;
    this.columnVisibleEnd = columnVisibleEnd;
  };

  jumpToRow = (scrollToRowIndex) => {
    const { treeNodesCount } = this.props;
    const rowHeight = this.getRowHeight();
    const height = this.resultContentRef.offsetHeight;
    const scrollTop = Math.min(scrollToRowIndex * rowHeight, treeNodesCount * rowHeight - height);
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

  onHitTopCanvas = () => {
    const rowHeight = this.getRowHeight();
    const node = this.resultContentRef;
    node.scrollTop -= (rowHeight - this.getClientScrollTopOffset(node));
  };

  onHitBottomCanvas = () => {
    const rowHeight = this.getRowHeight();
    const node = this.resultContentRef;
    node.scrollTop += rowHeight + this.getClientScrollTopOffset(node);
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
      const { columns, recordGetterByIndex, checkCanModifyRecord } = this.props;
      const column = getColumnByIndex(cell.idx, columns);
      const supportOpenEditor = checkIsColumnSupportDirectEdit(column);
      const hasOpenPermission = checkIsCellSupportOpenEditor(cell, column, false, recordGetterByIndex, checkCanModifyRecord);
      this.selectCell(cell, supportOpenEditor && hasOpenPermission);
    }
    this.props.onCellClick(cell);
    this.setState({ selectedPosition: cell });
  };

  onCellDoubleClick = (cell, e) => {
    const { columns, recordGetterByIndex, checkCanModifyRecord } = this.props;
    const column = getColumnByIndex(cell.idx, columns);
    const supportOpenEditor = checkEditableViaClickCell(column);
    const hasOpenPermission = checkIsCellSupportOpenEditor(cell, column, false, recordGetterByIndex, checkCanModifyRecord);
    this.selectCell(cell, supportOpenEditor && hasOpenPermission);
  };

  onCellMouseDown = (cellPosition, event) => {
    // onRangeSelectStart
    if (!isShiftKeyDown(event)) {
      this.selectCell(cellPosition);
      this.selectStart(cellPosition);
      window.addEventListener('mouseup', this.onWindowMouseUp);
    }
  };

  onCellMouseEnter = (cellPosition) => {
    // onRangeSelectUpdate
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
    this.setState({
      selectedPosition: Object.assign({}, this.state.selectedPosition, cellPosition),
    });
    this.props.onCellContextMenu(cellPosition);
  };

  handleDragEnter = ({ overRecordIdx, overGroupRecordIndex }) => {
    this.eventBus.dispatch(EVENT_BUS_TYPE.DRAG_ENTER, { overRecordIdx, overGroupRecordIndex });
  };

  /**
   * When updating the selection by moving the mouse, you need to automatically scroll to expand the visible area
   * @param {object} selectedRange
   */
  updateViewableArea = (selectedRange) => {
    const { sequenceColumnWidth } = this.props;
    const { mousePosition } = selectedRange.cursorCell;
    const { x: mouseX, y: mouseY } = mousePosition;
    const tableHeaderHeight = 50 + 48 + 32;
    const interval = 100;
    const step = 8;

    // cursor is at right boundary
    if (mouseX + interval > window.innerWidth) {
      this.scrollToRight();
    } else if (mouseX - interval < sequenceColumnWidth + this.props.frozenColumnsWidth) {
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

  toggleExpandNode = (nodeKey) => {
    const { recordsTree, searchResult } = this.props;
    const { keyNodeFoldedMap, keyNodeFoldedMapForSearch, endRenderIndex } = this.state;
    const hasSearchResult = checkHasSearchResult(searchResult);
    let updatedKeyNodeFoldedMap = { ...keyNodeFoldedMap };
    let updatedKeyNodeFoldedMapForSearch = { ...keyNodeFoldedMapForSearch };
    if (hasSearchResult) {
      if (updatedKeyNodeFoldedMapForSearch[nodeKey]) {
        delete updatedKeyNodeFoldedMapForSearch[nodeKey];
        delete updatedKeyNodeFoldedMap[nodeKey];
      } else {
        updatedKeyNodeFoldedMapForSearch[nodeKey] = true;
        updatedKeyNodeFoldedMap[nodeKey] = true;
      }
    } else {
      if (updatedKeyNodeFoldedMap[nodeKey]) {
        delete updatedKeyNodeFoldedMap[nodeKey];
      } else {
        updatedKeyNodeFoldedMap[nodeKey] = true;
      }
    }

    if (this.props.storeFoldedTreeNodes) {
      // store folded status
      this.props.storeFoldedTreeNodes(LOCAL_KEY_TREE_NODE_FOLDED, updatedKeyNodeFoldedMap);
    }

    const updatedNodes = this.getShownNodes(recordsTree, hasSearchResult ? updatedKeyNodeFoldedMapForSearch : updatedKeyNodeFoldedMap);
    let updates = {
      nodes: updatedNodes,
      keyNodeFoldedMap: updatedKeyNodeFoldedMap,
    };
    if (hasSearchResult) {
      updates.keyNodeFoldedMapForSearch = updatedKeyNodeFoldedMapForSearch;
    }

    const end = this.recalculateRenderEndIndex(updatedNodes);
    if (end !== endRenderIndex) {
      updates.endRenderIndex = end;
    }
    this.setState(updates);
  };

  getVisibleNodesInRange = () => {
    const { nodes, startRenderIndex, endRenderIndex } = this.state;
    return nodes.slice(startRenderIndex, endRenderIndex);
  };

  renderRecords = () => {
    const { treeMetrics, showCellColoring, columnColors, searchResult } = this.props;
    const { nodes, keyNodeFoldedMap, keyNodeFoldedMapForSearch, startRenderIndex, endRenderIndex, selectedPosition } = this.state;
    this.initFrozenNodesRef();
    const visibleNodes = this.getVisibleNodesInRange();
    const nodesCount = nodes.length;
    const lastRecordIndex = nodesCount - 1;
    const scrollLeft = this.props.getScrollLeft();
    const rowHeight = this.getRowHeight();
    const cellMetaData = this.getCellMetaData();
    const hasSearchResult = checkHasSearchResult(searchResult);
    let shownNodes = visibleNodes.map((node, index) => {
      const { _id: recordId, node_key, node_depth, node_index } = node;
      const hasChildNodes = checkTreeNodeHasChildNodes(node);
      const record = this.props.recordGetterById(recordId);
      const isSelected = TreeMetrics.checkIsTreeNodeSelected(node_key, treeMetrics);
      const recordIndex = startRenderIndex + index;
      const isLastRecord = lastRecordIndex === recordIndex;
      const hasSelectedCell = this.props.hasSelectedCell({ recordIndex }, selectedPosition);
      const columnColor = showCellColoring ? columnColors[recordId] : {};
      const isFoldedNode = hasSearchResult ? !!keyNodeFoldedMapForSearch[node_key] : !!keyNodeFoldedMap[node_key];
      return (
        <Record
          showRecordAsTree
          key={`sf-table-tree-node-${node_key}`}
          ref={ref => {
            this.addFrozenNodeRef(ref);
          }}
          isSelected={isSelected}
          index={recordIndex}
          isLastRecord={isLastRecord}
          showSequenceColumn={this.props.showSequenceColumn}
          record={record}
          columns={this.props.columns}
          sequenceColumnWidth={this.props.sequenceColumnWidth}
          colOverScanStartIdx={this.props.colOverScanStartIdx}
          colOverScanEndIdx={this.props.colOverScanEndIdx}
          lastFrozenColumnKey={this.props.lastFrozenColumnKey}
          recordDraggable={this.props.recordDraggable}
          recordDragDropEvents={this.props.recordDragDropEvents}
          draggingRecordSource={this.props.draggingRecordSource}
          scrollLeft={scrollLeft}
          height={rowHeight}
          cellMetaData={cellMetaData}
          columnColor={columnColor}
          searchResult={searchResult}
          treeNodeIndex={node_index}
          treeNodeKey={node_key}
          treeNodeDepth={node_depth}
          hasChildNodes={hasChildNodes}
          isFoldedTreeNode={isFoldedNode}
          checkCanModifyRecord={this.props.checkCanModifyRecord}
          checkCellValueChanged={this.props.checkCellValueChanged}
          hasSelectedCell={hasSelectedCell}
          selectedPosition={selectedPosition}
          selectNoneCells={this.selectNoneCells}
          onSelectRecord={this.props.onSelectRecord}
          toggleExpandTreeNode={() => this.toggleExpandNode(node_key)}
        />
      );
    });

    const upperHeight = startRenderIndex * ROW_HEIGHT;
    const belowHeight = (nodesCount - endRenderIndex) * ROW_HEIGHT;

    // add top placeholder
    if (upperHeight > 0) {
      const style = { height: upperHeight, width: '100%' };
      const upperRow = <div key="upper-placeholder" className="d-flex align-items-end" style={style}><Loading /></div>;
      shownNodes.unshift(upperRow);
    }

    // add bottom placeholder
    if (belowHeight > 0) {
      const style = { height: belowHeight, width: '100%' };
      const belowRow = <div key="below-placeholder" style={style}><Loading /></div>;
      shownNodes.push(belowRow);
    }
    return shownNodes;
  };

  render() {
    return (
      <>
        <div
          id="canvas"
          className="sf-table-canvas"
          ref={this.setResultContentRef}
          onScroll={this.onScroll}
          onKeyDown={this.props.onGridKeyDown}
          onKeyUp={this.props.onGridKeyUp}
        >
          <InteractionMasks
            {...this.props}
            showRecordAsTree
            ref={this.setInteractionMaskRef}
            recordsCount={this.state.nodes.length}
            treeNodeKeyRecordIdMap={this.props.treeNodeKeyRecordIdMap}
            treeMetrics={this.props.treeMetrics}
            rowHeight={this.getRowHeight()}
            getRowTop={this.getRowTop}
            scrollTop={this.oldScrollTop}
            selectNone={this.selectNone}
            getVisibleIndex={this.getVisibleIndex}
            onHitBottomBoundary={this.onHitBottomCanvas}
            onHitTopBoundary={this.onHitTopCanvas}
            onCellClick={this.onCellClick}
            scrollToColumn={this.scrollToColumn}
          />
          <div className="sf-table-records-wrapper" style={{ width: this.props.totalWidth + this.props.sequenceColumnWidth }} ref={this.setResultRef}>
            {this.renderRecords()}
          </div>
        </div>
        <RightScrollbar
          ref={this.setRightScrollbar}
          getClientHeight={this.getCanvasClientHeight}
          getScrollHeight={this.getRecordsWrapperScrollHeight}
          onScrollbarScroll={this.onScrollbarScroll}
          onScrollbarMouseUp={this.onScrollbarMouseUp}
        />
      </>
    );
  }
}

TreeBody.propTypes = {
  onRef: PropTypes.func,
  contextMenu: PropTypes.oneOfType([PropTypes.node, PropTypes.element]),
  tableId: PropTypes.string,
  recordsCount: PropTypes.number,
  recordIds: PropTypes.array,
  recordsTree: PropTypes.array,
  treeNodesCount: PropTypes.number,
  treeNodeKeyRecordIdMap: PropTypes.object,
  keyTreeNodeFoldedMap: PropTypes.object,
  treeMetrics: PropTypes.object,
  recordDraggable: PropTypes.bool,
  recordDragDropEvents: PropTypes.object,
  draggingRecordSource: PropTypes.object,
  columns: PropTypes.array.isRequired,
  CellOperationBtn: PropTypes.object,
  colOverScanStartIdx: PropTypes.number,
  colOverScanEndIdx: PropTypes.number,
  lastFrozenColumnKey: PropTypes.string,
  showSequenceColumn: PropTypes.bool,
  sequenceColumnWidth: PropTypes.number,
  hasSelectedRecord: PropTypes.bool,
  totalWidth: PropTypes.number,
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
  editorPortalTarget: PropTypes.instanceOf(Element),
  recordGetterByIndex: PropTypes.func,
  recordGetterById: PropTypes.func,
  modifyRecord: PropTypes.func,
  selectNone: PropTypes.func,
  onCellClick: PropTypes.func,
  onCellRangeSelectionUpdated: PropTypes.func,
  onSelectRecord: PropTypes.func,
  checkCanModifyRecord: PropTypes.func,
  paste: PropTypes.func,
  searchResult: PropTypes.object,
  scrollToRowIndex: PropTypes.number,
  frozenColumnsWidth: PropTypes.number,
  editMobileCell: PropTypes.func,
  reloadRecords: PropTypes.func,
  showCellColoring: PropTypes.bool,
  columnColors: PropTypes.object,
  onFillingDragRows: PropTypes.func,
  getUpdateDraggedRecords: PropTypes.func,
  getCopiedRecordsAndColumnsFromRange: PropTypes.func,
  onCellContextMenu: PropTypes.func,
  getTableCanvasContainerRect: PropTypes.func,
  storeFoldedTreeNodes: PropTypes.func,
};

export default TreeBody;
