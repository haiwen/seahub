import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import SFTable from '../../../../components/sf-table';
import EditTagDialog from '../../../components/dialog/edit-tag-dialog';
import { createTableColumns } from './columns-factory';
import { createContextMenuOptions } from './context-menu-options';
import { gettext } from '../../../../utils/constants';
import { PRIVATE_COLUMN_KEY } from '../../../constants';
import { useTags } from '../../../hooks';
import EventBus from '../../../../components/common/event-bus';
import { EVENT_BUS_TYPE } from '../../../../components/sf-table/constants/event-bus-type';
import { LOCAL_KEY_TREE_NODE_FOLDED } from '../../../../components/sf-table/constants/tree';

import './index.css';

const TABLE_ID = 'metadata_tas';
const DEFAULT_TABLE_DATA = {
  rows: [],
  row_ids: [],
  id_row_map: {},
  columns: [],
};

const KEY_STORE_SCROLL = 'table_scroll';

const VISIBLE_COLUMNS_KEYS = [
  PRIVATE_COLUMN_KEY.TAG_NAME, PRIVATE_COLUMN_KEY.PARENT_LINKS, PRIVATE_COLUMN_KEY.SUB_LINKS, PRIVATE_COLUMN_KEY.TAG_FILE_LINKS,
];

const TagsTable = ({
  context,
  isLoadingMoreRecords,
  modifyColumnWidth: modifyColumnWidthAPI,
  setDisplayTag,
  loadMore,
}) => {
  const { tagsData, updateTag, deleteTags, addTagLinks, deleteTagLinks, addChildTag } = useTags();

  const [isShowNewSubTagDialog, setIsShowNewSubTagDialog] = useState(false);

  const parentTagIdRef = useRef(null);

  const onDeleteTags = useCallback((tagsIds) => {
    deleteTags(tagsIds);

    const eventBus = EventBus.getInstance();
    eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  }, [deleteTags]);

  const onNewSubTag = useCallback((parentTagId) => {
    parentTagIdRef.current = parentTagId;
    setIsShowNewSubTagDialog(true);
  }, []);

  const closeNewSubTagDialog = useCallback(() => {
    parentTagIdRef.current = null;
    setIsShowNewSubTagDialog(false);
  }, []);

  const handelAddChildTag = useCallback((tagData, callback) => {
    addChildTag(tagData, parentTagIdRef.current, callback);
  }, [addChildTag]);

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

  const storeGridScroll = useCallback((gridScroll) => {
    window.sfTagsDataContext.localStorage.setItem(KEY_STORE_SCROLL, JSON.stringify(gridScroll));
  }, []);

  const foldedGroups = useMemo(() => {
    return {};
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
    });
  }, [context, onDeleteTags, onNewSubTag]);

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
        foldedGroups={foldedGroups}
        gridScroll={gridScroll}
        visibleColumns={visibleColumns}
        noRecordsTipsText={gettext('No tags')}
        isLoadingMoreRecords={isLoadingMoreRecords}
        hasMoreRecords={table.hasMore}
        showGridFooter={false}
        createContextMenuOptions={createTagContextMenuOptions}
        storeGridScroll={storeGridScroll}
        storeFoldedGroups={storeFoldedGroups}
        storeFoldedTreeNodes={storeFoldedTreeNodes}
        checkCanModifyRecord={checkCanModifyTag}
        checkCellValueChanged={checkCellValueChanged}
        modifyColumnWidth={modifyColumnWidth}
        loadMore={loadMore}
      />
      {isShowNewSubTagDialog && (
        <EditTagDialog tags={table.rows} title={gettext('New child tag')} onToggle={closeNewSubTagDialog} onSubmit={handelAddChildTag} />
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
