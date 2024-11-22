import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import { useMetadataStatus } from '../../hooks';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { getTagColor, getTagId, getTagName, getCellValueByColumn } from '../utils/cell/core';
import Context from '../context';
import Store from '../store';
import { PER_LOAD_NUMBER, EVENT_BUS_TYPE } from '../../metadata/constants';
import { getRowById } from '../../metadata/utils/table';
import { gettext } from '../../utils/constants';
import { PRIVATE_COLUMN_KEY } from '../constants';
import { getColumnOriginName } from '../../metadata/utils/column';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes, views data, etc.
const TagsContext = React.createContext(null);

export const TagsProvider = ({ repoID, selectTagsView, children, ...params }) => {

  const [isLoading, setLoading] = useState(true);
  const [tagsData, setTagsData] = useState(null);

  const storeRef = useRef(null);
  const contextRef = useRef(null);

  const { enableMetadata, enableTags } = useMetadataStatus();

  const tagsChanged = useCallback(() => {
    setTagsData(storeRef.current.data);
  }, []);

  const handleTableError = useCallback((error) => {
    toaster.danger(error.error);
  }, []);

  const updateTags = useCallback((data) => {
    setTagsData(data);
  }, []);

  const reloadTags = useCallback(() => {
    setLoading(true);
    storeRef.current.reload(PER_LOAD_NUMBER).then(() => {
      setTagsData(storeRef.current.data);
      setLoading(false);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (enableMetadata && enableTags) {
      setLoading(true);
      // init context
      contextRef.current = new Context();
      contextRef.current.init({ ...params, repoID });
      window.sfTagsDataContext = contextRef.current;
      storeRef.current = new Store({ context: contextRef.current, repoId: repoID });
      window.sfTagsDataStore = storeRef.current;
      storeRef.current.initStartIndex();
      storeRef.current.load(PER_LOAD_NUMBER).then(() => {
        setTagsData(storeRef.current.data);
        setLoading(false);
      }).catch(error => {
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
      });
      const eventBus = contextRef.current.eventBus;
      const unsubscribeServerTagsChanged = eventBus.subscribe(EVENT_BUS_TYPE.SERVER_TABLE_CHANGED, tagsChanged);
      const unsubscribeTagsChanged = eventBus.subscribe(EVENT_BUS_TYPE.LOCAL_TABLE_CHANGED, tagsChanged);
      const unsubscribeHandleTableError = eventBus.subscribe(EVENT_BUS_TYPE.TABLE_ERROR, handleTableError);
      const unsubscribeUpdateRows = eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_TABLE_ROWS, updateTags);
      const unsubscribeReloadData = eventBus.subscribe(EVENT_BUS_TYPE.RELOAD_DATA, reloadTags);
      return () => {
        if (window.sfTagsDataContext) {
          window.sfTagsDataContext.destroy();
        }
        storeRef.current.destroy();
        unsubscribeServerTagsChanged();
        unsubscribeTagsChanged();
        unsubscribeHandleTableError();
        unsubscribeUpdateRows();
        unsubscribeReloadData();
      };
    }
    setTagsData(null);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, enableMetadata, enableTags]);

  const handelSelectTag = useCallback((tag, isSelected) => {
    if (isSelected) return;
    const id = getTagId(tag);
    const node = {
      children: [],
      path: '/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES + '/' + id,
      isExpanded: false,
      isLoaded: true,
      isPreload: true,
      object: {
        file_tags: [],
        id: id,
        type: PRIVATE_FILE_TYPE.TAGS_PROPERTIES,
        isDir: () => false,
      },
      parentNode: {},
      key: repoID,
      tag_id: id,
    };
    selectTagsView(node);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, selectTagsView]);

  const addTag = useCallback((row, callback) => {
    return storeRef.current.addTags([row], callback);
  }, []);

  const modifyTags = useCallback((tagIds, idTagUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, { success_callback, fail_callback }) => {
    storeRef.current.modifyTags(tagIds, idTagUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, { success_callback, fail_callback });
  }, [storeRef]);

  const modifyLocalTags = useCallback((tagIds, idTagUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, { success_callback, fail_callback }) => {
    storeRef.current.modifyLocalTags(tagIds, idTagUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, { success_callback, fail_callback });
  }, [storeRef]);

  const deleteTags = useCallback((tagIds) => {
    storeRef.current.deleteTags(tagIds);
  }, [storeRef]);

  const duplicateTag = useCallback((tagId) => {
    const tag = getRowById(tagsData, tagId);
    if (!tag) return;
    const newTag = {
      [PRIVATE_COLUMN_KEY.TAG_NAME]: `${getTagName(tag)}(${gettext('copy')})`,
      [PRIVATE_COLUMN_KEY.TAG_COLOR]: getTagColor(tag),
    };
    addTag(newTag, {
      success_callback: (operation) => {
        const copiedTag = operation.tags[0];
        handelSelectTag(copiedTag);
      }
    });
  }, [tagsData, addTag, handelSelectTag]);

  const updateTag = useCallback((tagId, update, { success_callback, fail_callback } = { }) => {
    const tag = getRowById(tagsData, tagId);
    const tagIds = [tagId];
    const idTagUpdates = { [tagId]: update };
    let originalRowUpdates = {};
    let oldRowData = {};
    let originalOldRowData = {};
    Object.keys(update).forEach(key => {
      const column = tagsData.key_column_map[key];
      const columnName = getColumnOriginName(column);
      originalRowUpdates[key] = update[key];
      oldRowData[key] = getCellValueByColumn(tag, column);
      originalOldRowData[columnName] = getCellValueByColumn(tag, column);
    });

    modifyTags(tagIds, idTagUpdates, { [tagId]: originalRowUpdates }, { [tagId]: oldRowData }, { [tagId]: originalOldRowData }, { success_callback, fail_callback });
  }, [tagsData, modifyTags]);

  const updateLocalTag = useCallback((tagId, update, { success_callback, fail_callback } = { }) => {
    const tag = getRowById(tagsData, tagId);
    const tagIds = [tagId];
    const idTagUpdates = { [tagId]: update };
    let originalRowUpdates = {};
    let oldRowData = {};
    let originalOldRowData = {};
    Object.keys(update).forEach(key => {
      const column = tagsData.key_column_map[key];
      const columnName = getColumnOriginName(column);
      originalRowUpdates[key] = update[key];
      oldRowData[key] = getCellValueByColumn(tag, column);
      originalOldRowData[columnName] = getCellValueByColumn(tag, column);
    });

    modifyLocalTags(tagIds, idTagUpdates, { [tagId]: originalRowUpdates }, { [tagId]: oldRowData }, { [tagId]: originalOldRowData }, { success_callback, fail_callback });
  }, [tagsData, modifyLocalTags]);

  return (
    <TagsContext.Provider value={{
      isLoading,
      tagsData,
      store: storeRef.current,
      context: contextRef.current,
      deleteFilesCallback: params.deleteFilesCallback,
      renameFileCallback: params.renameFileCallback,
      updateCurrentDirent: params.updateCurrentDirent,
      closeDirentDetail: params.closeDirentDetail,
      addTag,
      modifyTags,
      deleteTags,
      duplicateTag,
      updateTag,
      updateLocalTag,
      selectTag: handelSelectTag,
    }}>
      {children}
    </TagsContext.Provider>
  );
};

export const useTags = () => {
  const context = useContext(TagsContext);
  if (!context) {
    throw new Error('\'TagsContext\' is null');
  }
  return context;
};