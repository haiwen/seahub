import React, { useCallback, useContext, useEffect, useState } from 'react';
import { getTreeNodeById, getTreeNodeByKey } from '../../components/sf-table/utils/tree';
import { useFileOperations } from '../../hooks/file-operations';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import tagsAPI from '../api';
import { TAG_FILE_KEY } from '../constants/file';
import { getFileById, sortTagFiles } from '../utils/file';
import { getSortBy, getSortOrder } from '../utils/sort';
import { getAllChildTagsIdsFromNode } from '../utils/tree';
import { useTags } from './tags';

const TagViewContext = React.createContext(null);

export const TagViewProvider = ({
  repoID, tagID, nodeKey, children,
  copyFileCallback, convertFileCallback,
  toggleShowDirentToolbar,
  ...params
}) => {
  const [isLoading, setLoading] = useState(true);
  const [tagFiles, setTagFiles] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  const { tagsData, tagFilesSort, tagFilesViewMode, modifyTagFilesSort } = useTags();
  const { handleDownload, handleCopy, handleAccessLog, handleShare } = useFileOperations();
  const sortBy = getSortBy(tagFilesSort);
  const sortOrder = getSortOrder(tagFilesSort);
  const viewMode = tagFilesViewMode;

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
  }, [tagFiles, toggleShowDirentToolbar]);

  const copyTagFile = useCallback(() => {
    if (!selectedFileIds || selectedFileIds.length === 0) return null;

    const selectedFile = getFileById(tagFiles, selectedFileIds[0]);
    const path = selectedFile[TAG_FILE_KEY.PARENT_DIR];
    const dirent = { name: selectedFile[TAG_FILE_KEY.NAME] };
    const callback = (targetRepo, dirent, targetParentPath, sourceParentPath, isByDialog) => {
      seafileAPI.copyDir(repoID, targetRepo.repo_id, targetParentPath, sourceParentPath, dirent.name).then(res => {
        copyFileCallback && copyFileCallback(repoID, targetRepo, dirent, targetParentPath, sourceParentPath, res.data.task_id || null, isByDialog);
        updateSelectedFileIds([]);
      });
    };
    handleCopy(path, dirent, false, callback);
  }, [repoID, selectedFileIds, tagFiles, copyFileCallback, updateSelectedFileIds, handleCopy]);

  const downloadTagFiles = useCallback(() => {
    if (!selectedFileIds.length) return;

    const direntList = selectedFileIds
      .map(id => {
        const file = getFileById(tagFiles, id);
        const name = file[TAG_FILE_KEY.PARENT_DIR] === '/' ? file[TAG_FILE_KEY.NAME] : `${file[TAG_FILE_KEY.PARENT_DIR]}/${file[TAG_FILE_KEY.NAME]}`;
        return { name };
      });
    handleDownload('/', direntList);
  }, [tagFiles, selectedFileIds, handleDownload]);

  const displayFileDetails = useCallback(() => {
    if (!selectedFileIds || selectedFileIds.length === 0) return null;
    const selectedFile = getFileById(tagFiles, selectedFileIds[0]);
    const name = selectedFile[TAG_FILE_KEY.NAME];
    const parentDir = selectedFile[TAG_FILE_KEY.PARENT_DIR];
    const dirent = {
      type: 'file',
      name,
      path: parentDir
    };
    params.showDirentDetail({ dirent });
  }, [tagFiles, selectedFileIds, params]);

  const shareTagFile = useCallback(() => {
    if (!selectedFileIds || selectedFileIds.length === 0) return null;
    const selectedFile = getFileById(tagFiles, selectedFileIds[0]);
    const name = selectedFile[TAG_FILE_KEY.NAME];
    const path = Utils.joinPath(selectedFile[TAG_FILE_KEY.PARENT_DIR], name);
    const dirent = {
      type: 'file',
      name,
      path,
    };
    handleShare(path, dirent);
  }, [selectedFileIds, tagFiles, handleShare]);

  const openTagFileAccessLog = useCallback(() => {
    if (!selectedFileIds || selectedFileIds.length === 0) return null;
    const selectedFile = getFileById(tagFiles, selectedFileIds[0]);
    const name = selectedFile[TAG_FILE_KEY.NAME];
    const path = Utils.joinPath(selectedFile[TAG_FILE_KEY.PARENT_DIR], name);
    handleAccessLog(path, name);
  }, [selectedFileIds, tagFiles, handleAccessLog]);

  const convertFile = useCallback((path, dstType) => {
    seafileAPI.convertFile(repoID, path, dstType).then((res) => {
      const newFileName = res.data.obj_name;
      const parentDir = res.data.parent_dir;
      convertFileCallback({ newName: newFileName, parentDir, size: res.data.size });
    }).catch((error) => {
      convertFileCallback({ path, error });
    });
  }, [repoID, convertFileCallback]);

  const updateTagFile = useCallback((file, updates) => {
    const id = file[TAG_FILE_KEY.ID];
    const nextTagFiles = {
      ...tagFiles,
      rows: tagFiles.rows.map(row => {
        if (row[TAG_FILE_KEY.ID] === id) {
          return { ...row, ...updates };
        }
        return row;
      })
    };
    setTagFiles(nextTagFiles);

    setTimeout(() => {
      window.sfTagsDataContext && window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_TAG_FILES, nextTagFiles);
    }, 0);
  }, [tagFiles]);

  useEffect(() => {
    setLoading(true);
    const childTagsIds = getChildTagsIds(tagID, nodeKey);
    let tagsIds = [tagID];
    if (Array.isArray(childTagsIds) && childTagsIds.length > 0) {
      tagsIds.push(...childTagsIds);
    }
    tagsAPI.getTagsFiles(repoID, tagsIds).then(res => {
      const rows = res.data?.results || [];
      const sorted = sortTagFiles([...rows], tagFilesSort);
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
    setTagFiles(prevTagFiles => {
      if (!prevTagFiles) return prevTagFiles;
      return {
        ...prevTagFiles,
        rows: sortTagFiles([...prevTagFiles.rows], tagFilesSort),
      };
    });
  }, [tagFilesSort]);

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
      updateTagFile,
      copyTagFile,
      downloadTagFiles,
      displayFileDetails,
      convertFile,
      modifyTagFilesSort,
      sortBy,
      sortOrder,
      viewMode,
      openTagFileAccessLog,
      shareTagFile,
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
