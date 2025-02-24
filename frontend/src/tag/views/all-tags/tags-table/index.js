import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import SFTable from '../../../../components/sf-table';
import EditTagDialog from '../../../components/dialog/edit-tag-dialog';
import MergeTagsSelector from '../../../components/merge-tags-selector';
import DraggedTagsLayer from './dragged-tags-layer';
import { createTableColumns } from './columns-factory';
import { createContextMenuOptions } from './context-menu-options';
import { gettext } from '../../../../utils/constants';
import { PRIVATE_COLUMN_KEY, VISIBLE_COLUMNS_KEYS } from '../../../constants';
import { useTags } from '../../../hooks';
import EventBus from '../../../../components/common/event-bus';
import { EVENT_BUS_TYPE } from '../../../../metadata/constants';
import { EVENT_BUS_TYPE as TABLE_EVENT_BUS_TYPE } from '../../../../components/sf-table/constants/event-bus-type';
import { LOCAL_KEY_TREE_NODE_FOLDED } from '../../../../components/sf-table/constants/tree';
import { isNumber } from '../../../../utils/number';
import { getTreeNodeByKey, getTreeNodeId } from '../../../../components/sf-table/utils/tree';
import { getRowById } from '../../../../components/sf-table/utils/table';
import { getParentLinks } from '../../../utils/cell';

import './index.css';

const TABLE_ID = 'metadata_tas';
const DEFAULT_TABLE_DATA = {
  rows: [],
  row_ids: [],
  id_row_map: {},
  columns: [],
};

const KEY_STORE_SCROLL = 'table_scroll';

const TagsTable = ({
  context,
  isLoadingMoreRecords,
  modifyColumnWidth: modifyColumnWidthAPI,
  setDisplayTag,
  loadMore,
}) => {
  const { tagsData, updateTag, deleteTags, addTagLinks, deleteTagLinks, deleteTagsLinks, addChildTag, mergeTags } = useTags();

  const [isShowNewSubTagDialog, setIsShowNewSubTagDialog] = useState(false);
  const [isShowMergeTagsSelector, setIsShowMergeTagsSelector] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  const parentTagIdRef = useRef(null);
  const mergeTagsSelectorProps = useRef({});

  const table = useMemo(() => {
    if (!tagsData) {
      return {
        _id: TABLE_ID,
        ...DEFAULT_TABLE_DATA,
      };
    }
    return {
      _id: TABLE_ID,
      ...tagsData,
      columns: createTableColumns(tagsData.columns, {
        setDisplayTag,
        updateTag,
        addTagLinks,
        deleteTagLinks,
      }),
    };
  }, [tagsData, setDisplayTag, updateTag, addTagLinks, deleteTagLinks]);

  const visibleColumns = useMemo(() => {
    const keyColumnMap = table.columns.reduce((currKeyColumnMap, column) => ({ ...currKeyColumnMap, [column.key]: column }), {});
    const visibleColumns = VISIBLE_COLUMNS_KEYS.map((key) => keyColumnMap[key]).filter(Boolean);
    return visibleColumns;
  }, [table]);

  const canModifyTags = useMemo(() => {
    return context.canModifyTags();
  }, [context]);

  const recordsIds = useMemo(() => {
    return table.row_ids || [];
  }, [table]);

  const recordsTree = useMemo(() => {
    return table.rows_tree || [];
  }, [table]);

  const keyTreeNodeFoldedMap = useMemo(() => {
    const strKeyTreeNodeFoldedMap = window.sfTagsDataContext.localStorage.getItem(LOCAL_KEY_TREE_NODE_FOLDED);
    if (strKeyTreeNodeFoldedMap) {
      try {
        return JSON.parse(strKeyTreeNodeFoldedMap);
      } catch {
        return {};
      }
    }
    return {};
  }, []);

  const gridScroll = useMemo(() => {
    const strScroll = window.sfTagsDataContext.localStorage.getItem(KEY_STORE_SCROLL);
    let scroll = null;
    try {
      scroll = JSON.parse(strScroll);
    } catch {
      //  did nothing
    }
    return scroll || {};
  }, []);

  const onDeleteTags = useCallback((tagsIds) => {
    deleteTags(tagsIds);

    const eventBus = EventBus.getInstance();
    eventBus.dispatch(TABLE_EVENT_BUS_TYPE.SELECT_NONE);
  }, [deleteTags]);

  const onNewSubTag = useCallback((parentTagId) => {
    parentTagIdRef.current = parentTagId;
    setIsShowNewSubTagDialog(true);
  }, []);

  const closeNewSubTagDialog = useCallback(() => {
    parentTagIdRef.current = null;
    setIsShowNewSubTagDialog(false);
  }, []);

  const onMergeTags = useCallback((tagsIds, menuPosition) => {
    mergeTagsSelectorProps.current.mergeTagsIds = tagsIds;
    mergeTagsSelectorProps.current.position = {
      left: (menuPosition.left || 0),
      top: (menuPosition.top || 0),
    };
    setIsShowMergeTagsSelector(true);
  }, []);

  const closeMergeTagsSelector = useCallback(() => {
    mergeTagsSelectorProps.current = {};
    setIsShowMergeTagsSelector(false);
  }, []);

  const handelAddChildTag = useCallback((tagData, callback) => {
    addChildTag(tagData, parentTagIdRef.current, callback);
  }, [addChildTag]);

  const storeGridScroll = useCallback((gridScroll) => {
    window.sfTagsDataContext.localStorage.setItem(KEY_STORE_SCROLL, JSON.stringify(gridScroll));
  }, []);

  const storeFoldedGroups = useCallback(() => {}, []);

  const storeFoldedTreeNodes = useCallback((key, keyFoldedTreeNodesMap) => {
    window.sfTagsDataContext.localStorage.setItem(key, JSON.stringify(keyFoldedTreeNodesMap));
  }, []);

  const modifyColumnWidth = useCallback((column, newWidth) => {
    modifyColumnWidthAPI(column.key, newWidth);
  }, [modifyColumnWidthAPI]);

  const createTagContextMenuOptions = useCallback((tableProps) => {
    return createContextMenuOptions({
      ...tableProps,
      context,
      onDeleteTags,
      onNewSubTag,
      onMergeTags,
    });
  }, [context, onDeleteTags, onNewSubTag, onMergeTags]);

  const checkCanModifyTag = useCallback((tag) => {
    return context.canModifyTag(tag);
  }, [context]);

  const checkCellValueChanged = useCallback((column, prevTag, nextTag) => {
    if (column.key === PRIVATE_COLUMN_KEY.TAG_NAME) {
      return (
        prevTag[PRIVATE_COLUMN_KEY.TAG_NAME] !== nextTag[PRIVATE_COLUMN_KEY.TAG_NAME]
        || prevTag[PRIVATE_COLUMN_KEY.TAG_COLOR] !== nextTag[PRIVATE_COLUMN_KEY.TAG_COLOR]
      );
    }

    return false;
  }, []);

  const scrollToCurrentSelectedCell = useCallback((searchResult, currentSelectIndex) => {
    if (!window.sfTableBody) {
      return;
    }
    const cell = searchResult.matchedCells[currentSelectIndex];
    if (!cell) {
      return;
    }
    const { column: cellColumn, rowIndex: focusRowIndex } = cell;
    const { rowVisibleStart, rowVisibleEnd, columnVisibleStart, columnVisibleEnd } = window.sfTableBody;
    if (focusRowIndex < rowVisibleStart) {
      window.sfTableBody.jumpToRow(focusRowIndex - 1);
    } else if (focusRowIndex >= rowVisibleEnd) {
      window.sfTableBody.jumpToRow(focusRowIndex);
    }

    const focusColumnIndex = visibleColumns.findIndex((column) => column.key === cellColumn);
    if (columnVisibleStart >= focusColumnIndex || focusColumnIndex > columnVisibleEnd) {
      window.sfTableBody.scrollToColumn(focusColumnIndex);
    }
  }, [visibleColumns]);

  const updateSearchResult = useCallback((searchResult) => {
    setSearchResult(searchResult);
    const { currentSelectIndex } = searchResult || {};
    if (searchResult && isNumber(currentSelectIndex)) {
      scrollToCurrentSelectedCell(searchResult, currentSelectIndex);
    }
  }, [scrollToCurrentSelectedCell]);

  const renderCustomDraggedRows = useCallback((draggedNodesKeys) => {
    if (!Array.isArray(draggedNodesKeys) || draggedNodesKeys.length === 0) return null;
    return (
      <DraggedTagsLayer draggedNodesKeys={draggedNodesKeys} />
    );
  }, []);

  const moveTags = useCallback(({ draggingSource, dropTarget }) => {
    const targetNode = getTreeNodeByKey(dropTarget, table.key_tree_node_map);
    if (!Array.isArray(draggingSource) || draggingSource.length === 0 || !targetNode) return;
    let draggingTagsIds = [];
    let idNeedDeleteChildIds = {}; // { [parent_tag._id]: [child_tag._id] }
    draggingSource.forEach((nodeKey) => {
      const node = getTreeNodeByKey(nodeKey, table.key_tree_node_map);
      const nodeId = getTreeNodeId(node);
      const tag = getRowById(table, nodeId);

      // find the child tags to delete which related to dragging tags
      const parentLinks = getParentLinks(tag);
      if (Array.isArray(parentLinks) && parentLinks.length > 0) {
        parentLinks.forEach((link) => {
          const parentTagId = link.row_id;
          if (nodeKey.includes(parentTagId)) {
            if (!idNeedDeleteChildIds[parentTagId]) {
              idNeedDeleteChildIds[parentTagId] = [nodeId];
            } else if (!idNeedDeleteChildIds[parentTagId].includes(nodeId)) {
              idNeedDeleteChildIds[parentTagId].push(nodeId);
            }
          }
        });
      }

      // get none-repeat dragging tags ids
      if (!draggingTagsIds.includes(nodeId)) {
        draggingTagsIds.push(nodeId);
      }
    });
    if (draggingTagsIds.length === 0) return;

    const targetTagId = getTreeNodeId(targetNode);
    if (Object.keys(idNeedDeleteChildIds).length > 0) {
      // need to delete child tags first
      deleteTagsLinks(PRIVATE_COLUMN_KEY.SUB_LINKS, idNeedDeleteChildIds, () => {
        addTagLinks(PRIVATE_COLUMN_KEY.SUB_LINKS, targetTagId, draggingTagsIds);
      });
    } else {
      addTagLinks(PRIVATE_COLUMN_KEY.SUB_LINKS, targetTagId, draggingTagsIds);
    }
  }, [table, addTagLinks, deleteTagsLinks]);

  useEffect(() => {
    const eventBus = EventBus.getInstance();
    const unsubscribeUpdateSearchResult = eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_SEARCH_RESULT, updateSearchResult);
    return () => {
      unsubscribeUpdateSearchResult();
    };
  }, [updateSearchResult]);

  return (
    <>
      <SFTable
        key={`sf-table-${table._id}`}
        showRecordAsTree
        showSequenceColumn
        table={table}
        recordsIds={recordsIds}
        recordsTree={recordsTree}
        keyTreeNodeFoldedMap={keyTreeNodeFoldedMap}
        canModifyTags={canModifyTags}
        gridScroll={gridScroll}
        visibleColumns={visibleColumns}
        noRecordsTipsText={gettext('No tags')}
        isLoadingMoreRecords={isLoadingMoreRecords}
        hasMoreRecords={table.hasMore}
        showGridFooter={false}
        searchResult={searchResult}
        createContextMenuOptions={createTagContextMenuOptions}
        storeGridScroll={storeGridScroll}
        storeFoldedGroups={storeFoldedGroups}
        storeFoldedTreeNodes={storeFoldedTreeNodes}
        checkCanModifyRecord={checkCanModifyTag}
        checkCellValueChanged={checkCellValueChanged}
        modifyColumnWidth={modifyColumnWidth}
        loadMore={loadMore}
        renderCustomDraggedRows={renderCustomDraggedRows}
        moveRecords={moveTags}
      />
      {isShowNewSubTagDialog && (
        <EditTagDialog tags={table.rows} title={gettext('New child tag')} onToggle={closeNewSubTagDialog} onSubmit={handelAddChildTag} />
      )}
      {isShowMergeTagsSelector && (
        <MergeTagsSelector {...mergeTagsSelectorProps.current} closeSelector={closeMergeTagsSelector} mergeTags={mergeTags} />
      )}
    </>
  );
};

TagsTable.propTypes = {
  context: PropTypes.object,
  tagsData: PropTypes.object,
  isLoadingMoreRecords: PropTypes.bool,
  modifyColumnWidth: PropTypes.func,
  setDisplayTag: PropTypes.func,
  loadMore: PropTypes.func,
};

export default TagsTable;
