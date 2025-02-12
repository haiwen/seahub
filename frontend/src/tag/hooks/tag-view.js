import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Utils } from '../../utils/utils';
import tagsAPI from '../api';
import { useTags } from './tags';
import { getTreeNodeById, getTreeNodeByKey } from '../../components/sf-table/utils/tree';
import { getAllChildTagsIdsFromNode } from '../utils/tree';
import { seafileAPI } from '../../utils/seafile-api';
import { TAG_FILE_KEY } from '../constants/file';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes, views data, etc.
const TagViewContext = React.createContext(null);

export const TagViewProvider = ({ repoID, tagID, nodeKey, children, moveFileCallback, copyFileCallback, addFolderCallback, deleteFilesCallback, ...params }) => {
  const [isLoading, setLoading] = useState(true);
  const [tagFiles, setTagFiles] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const { tagsData } = useTags();

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

  const moveTagFile = useCallback((targetRepo, dirent, targetParentPath, sourceParentPath, isByDialog) => {
    seafileAPI.moveDir(repoID, targetRepo.repo_id, targetParentPath, sourceParentPath, dirent.name).then(res => {
      moveFileCallback && moveFileCallback(repoID, targetRepo, dirent, targetParentPath, sourceParentPath, res.data.task_id || null, isByDialog);
    });
  }, [repoID, moveFileCallback]);

  const copyTagFile = useCallback((targetRepo, dirent, targetParentPath, sourceParentPath, isByDialog) => {
    seafileAPI.copyDir(repoID, targetRepo.repo_id, targetParentPath, sourceParentPath, dirent.name).then(res => {
      copyFileCallback && copyFileCallback(repoID, targetRepo, dirent, targetParentPath, sourceParentPath, res.data.task_id || null, isByDialog);
    });
  }, [repoID, copyFileCallback]);

  const deleteTagFiles = useCallback((paths, fileNames, fileIds) => {
    tagsAPI.batchDeleteFiles(repoID, paths).then(() => {
      deleteFilesCallback && deleteFilesCallback(paths, fileNames);
      setTagFiles(prevTagFiles => ({
        ...prevTagFiles,
        rows: prevTagFiles.rows.filter(row => !fileIds.includes(row[TAG_FILE_KEY.ID]))
      }));
    });
  }, [repoID, deleteFilesCallback]);

  const zipDownloadTagFiles = useCallback

  useEffect(() => {
    setLoading(true);
    const childTagsIds = getChildTagsIds(tagID, nodeKey);
    let tagsIds = [tagID];
    if (Array.isArray(childTagsIds) && childTagsIds.length > 0) {
      tagsIds.push(...childTagsIds);
    }
    tagsAPI.getTagsFiles(repoID, tagsIds).then(res => {
      const rows = res.data?.results || [];
      setTagFiles({ columns: res.data?.metadata || [], rows });
      setLoading(false);
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error);
      setErrorMessage(errorMessage);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, tagID, nodeKey]);

  return (
    <TagViewContext.Provider value={{
      isLoading,
      errorMessage,
      tagFiles,
      repoID,
      tagID,
      repoInfo: params.repoInfo,
      renameFileCallback: params.renameFileCallback,
      updateCurrentDirent: params.updateCurrentDirent,
      moveTagFile: moveTagFile,
      copyTagFile: copyTagFile,
      addFolder: addFolderCallback,
      deleteTagFiles: deleteTagFiles,
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
