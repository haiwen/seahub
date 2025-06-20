import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toaster from '../../components/toast';
import { Utils } from '../../utils/utils';
import { metadataAPI } from '../../metadata';
import tagsAPI from '../api';
import { useTags } from './tags';
import { getTreeNodeById, getTreeNodeByKey } from '../../components/sf-table/utils/tree';
import { getAllChildTagsIdsFromNode } from '../utils/tree';
import { seafileAPI } from '../../utils/seafile-api';
import { TAG_FILE_KEY } from '../constants/file';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import { getFileById, sortTagFiles } from '../utils/file';
import { getRowById } from '../../components/sf-table/utils/table';
import { getTagFilesLinks } from '../utils/cell';
import { PRIVATE_COLUMN_KEY } from '../constants';
import URLDecorator from '../../utils/url-decorator';
import { fileServerRoot, gettext, useGoFileserver } from '../../utils/constants';
import { TAG_FILES_DEFAULT_SORT, TAG_FILES_SORT } from '../constants/sort';
import { TAG_FILES_VIEW_MODE, TAG_FILES_VIEW_MODE_DEFAULT } from '../constants/mode';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes, views data, etc.
const TagViewContext = React.createContext(null);

export const TagViewProvider = ({
  repoID, tagID, nodeKey, children, moveFileCallback, copyFileCallback, addFolderCallback, deleteFilesCallback, renameFileCallback, convertFileCallback,
  toggleShowDirentToolbar, ...params
}) => {
  const [isLoading, setLoading] = useState(true);
  const [tagFiles, setTagFiles] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState(TAG_FILES_VIEW_MODE_DEFAULT);

  const { tagsData, updateLocalTags } = useTags();

  const eventBus = useMemo(() => window.sfTagsDataContext?.eventBus, []);
  const localStorage = useMemo(() => window.sfTagsDataContext?.localStorage, []);

  const getChildTagsIds = useCallback((tagID, nodeKey) => {
    let displayNode = null;
    if (nodeKey) {
      displayNode = getTreeNodeByKey(nodeKey, tagsData.key_tree_node_map);
    }
    if (!displayNode) {
      displayNode = getTreeNodeById(tagID, tagsData.rows_tree);
    }
    return getAllChildTagsIdsFromNode(displayNode);
  }, [tagsData]);

  const updateSelectedFileIds = useCallback((ids) => {
    toggleShowDirentToolbar(ids.length > 0);
    setSelectedFileIds(ids);
    setTimeout(() => {
      window.sfTagsDataContext && window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_TAG_FILES, ids, tagFiles);
    }, 0);
  }, [setSelectedFileIds, tagFiles, toggleShowDirentToolbar]);

  const moveTagFile = useCallback((targetRepo, dirent, targetParentPath, sourceParentPath, isByDialog) => {
    seafileAPI.moveDir(repoID, targetRepo.repo_id, targetParentPath, sourceParentPath, dirent.name).then(res => {
      moveFileCallback && moveFileCallback(repoID, targetRepo, dirent, targetParentPath, sourceParentPath, res.data.task_id || null, isByDialog);
      updateSelectedFileIds([]);
    });
  }, [repoID, moveFileCallback, updateSelectedFileIds]);

  const copyTagFile = useCallback((targetRepo, dirent, targetParentPath, sourceParentPath, isByDialog) => {
    seafileAPI.copyDir(repoID, targetRepo.repo_id, targetParentPath, sourceParentPath, dirent.name).then(res => {
      copyFileCallback && copyFileCallback(repoID, targetRepo, dirent, targetParentPath, sourceParentPath, res.data.task_id || null, isByDialog);
      updateSelectedFileIds([]);
    });
  }, [repoID, copyFileCallback, updateSelectedFileIds]);

  const deleteTagFiles = useCallback((ids) => {
    const tagIds = ids?.length ? ids : selectedFileIds;
    const files = tagIds.map(id => getFileById(tagFiles, id));
    const paths = files.map(f => Utils.joinPath(f[TAG_FILE_KEY.PARENT_DIR], f[TAG_FILE_KEY.NAME]));
    const fileNames = files.map(f => f[TAG_FILE_KEY.NAME]);
    metadataAPI.batchDeleteFiles(repoID, paths).then(() => {
      const updatedTags = new Set();
      files.forEach(file => {
        file._tags.forEach(tag => updatedTags.add(tag.row_id));
      });

      let idTagUpdates = {};
      updatedTags.forEach(tagID => {
        const row = getRowById(tagsData, tagID);
        const oldTagFileLinks = getTagFilesLinks(row);
        if (Array.isArray(oldTagFileLinks) && oldTagFileLinks.length > 0) {
          const newTagFileLinks = oldTagFileLinks.filter(link => !tagIds.includes(link.row_id));
          const update = { [PRIVATE_COLUMN_KEY.TAG_FILE_LINKS]: newTagFileLinks };
          idTagUpdates[tagID] = update;
        }
      });
      updateLocalTags([...updatedTags], idTagUpdates);

      setTagFiles(prevTagFiles => ({
        ...prevTagFiles,
        rows: prevTagFiles.rows.filter(row => !tagIds.includes(row[TAG_FILE_KEY.ID])),
      }));

      deleteFilesCallback && deleteFilesCallback(paths, fileNames);
      updateSelectedFileIds([]);
      let msg = fileNames.length > 1
        ? gettext('Successfully deleted {name} and {n} other items')
        : gettext('Successfully deleted {name}');
      msg = msg.replace('{name}', fileNames[0])
        .replace('{n}', fileNames.length - 1);
      toaster.success(msg);
    });
  }, [repoID, tagsData, tagFiles, selectedFileIds, updateLocalTags, deleteFilesCallback, updateSelectedFileIds]);

  const getDownloadTarget = useCallback(() => {
    if (!selectedFileIds.length) return [];
    return selectedFileIds.map(id => {
      const file = getFileById(tagFiles, id);
      const path = file[TAG_FILE_KEY.PARENT_DIR] === '/' ? file[TAG_FILE_KEY.NAME] : `${file[TAG_FILE_KEY.PARENT_DIR]}/${file[TAG_FILE_KEY.NAME]}`;
      return path;
    });
  }, [tagFiles, selectedFileIds]);

  const downloadTagFiles = useCallback(() => {
    if (!selectedFileIds.length) return;
    if (selectedFileIds.length === 1) {
      const file = getFileById(tagFiles, selectedFileIds[0]);
      const filePath = Utils.joinPath(file[TAG_FILE_KEY.PARENT_DIR], file[TAG_FILE_KEY.NAME]);
      const url = URLDecorator.getUrl({ type: 'download_file_url', repoID, filePath });
      location.href = url;
      return;
    }
    if (!useGoFileserver) {
      window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_ZIP_DIALOG);
      return;
    }

    const target = getDownloadTarget();
    metadataAPI.zipDownload(repoID, '/', target).then(res => {
      const zipToken = res.data['zip_token'];
      location.href = `${fileServerRoot}zip/${zipToken}`;
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID, tagFiles, selectedFileIds, getDownloadTarget]);

  const renameTagFile = useCallback((id, path, newName) => {
    seafileAPI.renameFile(repoID, path, newName).then(res => {
      renameFileCallback && renameFileCallback(path, newName);
      setTagFiles(prevTagFiles => ({
        ...prevTagFiles,
        rows: prevTagFiles.rows.map(row => {
          if (row[TAG_FILE_KEY.ID] === id) {
            return { ...row, [TAG_FILE_KEY.NAME]: newName };
          }
          return row;
        })
      }));
      updateSelectedFileIds([]);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID, renameFileCallback, updateSelectedFileIds]);

  const convertFile = useCallback((path, dstType) => {
    seafileAPI.convertFile(repoID, path, dstType).then((res) => {
      const newFileName = res.data.obj_name;
      const parentDir = res.data.parent_dir;
      convertFileCallback({ newName: newFileName, parentDir, size: res.data.size });
    }).catch((error) => {
      convertFileCallback({ path, error });
    });
  }, [repoID, convertFileCallback]);

  const sortFiles = useCallback((sort) => {
    const sorted = sortTagFiles(tagFiles?.rows, sort);
    setTagFiles({
      ...tagFiles,
      rows: sorted,
    });
    setSortBy(sort.sort_by);
    setSortOrder(sort.order);
    localStorage && localStorage.setItem(TAG_FILES_SORT, JSON.stringify(sort));
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_TAG_FILES_SORT, sort);
  }, [tagFiles, localStorage, eventBus]);

  const switchViewMode = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  useEffect(() => {
    setLoading(true);
    const childTagsIds = getChildTagsIds(tagID, nodeKey);
    let tagsIds = [tagID];
    if (Array.isArray(childTagsIds) && childTagsIds.length > 0) {
      tagsIds.push(...childTagsIds);
    }
    tagsAPI.getTagsFiles(repoID, tagsIds).then(res => {
      const rows = res.data?.results || [];
      const savedSort = window.sfTagsDataContext?.localStorage?.getItem(TAG_FILES_SORT);
      const sort = savedSort ? JSON.parse(savedSort) : TAG_FILES_DEFAULT_SORT;
      const sorted = sortTagFiles(rows, sort);
      setTagFiles({ columns: res.data?.metadata || [], rows: sorted });
      setLoading(false);
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error);
      setErrorMessage(errorMessage);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, tagID, nodeKey, tagsData.rows]);

  useEffect(() => {
    const unsubscribeModifyTagFilesSort = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_TAG_FILES_SORT, sortFiles);
    const unsubscribeSwitchViewMode = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.SWITCH_TAG_FILES_VIEW_MODE, switchViewMode);

    return () => {
      unsubscribeModifyTagFilesSort && unsubscribeModifyTagFilesSort();
      unsubscribeSwitchViewMode && unsubscribeSwitchViewMode();
    };
  }, [eventBus, sortFiles, switchViewMode]);

  useEffect(() => {
    const savedSort = localStorage && localStorage.getItem(TAG_FILES_SORT);
    const sort = savedSort ? JSON.parse(savedSort) : TAG_FILES_DEFAULT_SORT;
    setSortBy(sort.sort_by);
    setSortOrder(sort.order);

    const savedViewMode = localStorage && localStorage.getItem(TAG_FILES_VIEW_MODE);
    const viewMode = savedViewMode ? savedViewMode : TAG_FILES_VIEW_MODE_DEFAULT;
    setViewMode(viewMode);
  }, [localStorage]);

  return (
    <TagViewContext.Provider value={{
      isLoading,
      errorMessage,
      tagFiles,
      repoID,
      tagID,
      repoInfo: params.repoInfo,
      updateCurrentDirent: params.updateCurrentDirent,
      selectedFileIds,
      updateSelectedFileIds,
      moveTagFile,
      copyTagFile,
      addFolder: addFolderCallback,
      deleteTagFiles,
      getDownloadTarget,
      downloadTagFiles,
      renameTagFile,
      convertFile,
      sortFiles,
      sortBy,
      sortOrder,
      viewMode,
    }}>
      {children}
    </TagViewContext.Provider>
  );
};

export const useTagView = () => {
  const context = useContext(TagViewContext);
  if (!context) {
    throw new Error('\'TagViewContext\' is null');
  }
  return context;
};
