import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Utils } from '../../utils/utils';
import tagsAPI from '../api';
import { useTags } from './tags';
import { getTreeNodeById, getTreeNodeByKey } from '../../components/sf-table/utils/tree';
import { getAllChildTagsIdsFromNode } from '../utils/tree';
import { seafileAPI } from '../../utils/seafile-api';
import { TAG_FILE_KEY } from '../constants/file';
import toaster from '../../components/toast';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import { getFileById } from '../utils/file';
import { getRowById } from '../../metadata/utils/table';
import { getTagFilesLinks } from '../utils/cell';
import { PRIVATE_COLUMN_KEY } from '../constants';
import URLDecorator from '../../utils/url-decorator';
import { fileServerRoot, useGoFileserver } from '../../utils/constants';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes, views data, etc.
const TagViewContext = React.createContext(null);

export const TagViewProvider = ({ repoID, tagID, nodeKey, children, moveFileCallback, copyFileCallback, addFolderCallback, deleteFilesCallback, renameFileCallback, ...params }) => {
  const [isLoading, setLoading] = useState(true);
  const [tagFiles, setTagFiles] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isZipDialogOpen, setIsZipDialogOpen] = useState(false);

  const { tagsData, selectedFileIds, updateSelectedFileIds, updateLocalTag } = useTags();

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

  const toggleMoveDialog = useCallback(() => {
    setIsMoveDialogOpen(!isMoveDialogOpen);
  }, [isMoveDialogOpen]);

  const toggleCopyDialog = useCallback(() => {
    setIsCopyDialogOpen(!isCopyDialogOpen);
  }, [isCopyDialogOpen]);

  const toggleZipDialog = useCallback(() => {
    setIsZipDialogOpen(!isZipDialogOpen);
  }, [isZipDialogOpen]);

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

  const deleteTagFiles = useCallback(() => {
    const files = selectedFileIds.map(id => getFileById(tagFiles, id));
    const paths = files.map(f => Utils.joinPath(f[TAG_FILE_KEY.PARENT_DIR], f[TAG_FILE_KEY.NAME]));
    const fileNames = files.map(f => f[TAG_FILE_KEY.NAME]);
    tagsAPI.batchDeleteFiles(repoID, paths).then(() => {
      const row = getRowById(tagsData, tagID);
      const oldTagFileLinks = getTagFilesLinks(row);
      const newTagFileLinks = oldTagFileLinks.filter(link => !selectedFileIds.includes(link.row_id));
      const update = { [PRIVATE_COLUMN_KEY.TAG_FILE_LINKS]: newTagFileLinks };
      updateLocalTag(tagID, update);

      deleteFilesCallback && deleteFilesCallback(paths, fileNames);

      setTagFiles(prevTagFiles => ({
        ...prevTagFiles,
        rows: prevTagFiles.rows.filter(row => !selectedFileIds.includes(row[TAG_FILE_KEY.ID]))
      }));
      updateSelectedFileIds([]);
    });
  }, [repoID, tagID, tagsData, tagFiles, selectedFileIds, updateLocalTag, deleteFilesCallback, updateSelectedFileIds]);

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
      toggleZipDialog();
      return;
    }

    const target = getDownloadTarget();
    tagsAPI.zipDownload(repoID, '/', target).then(res => {
      const zipToken = res.data['zip_token'];
      location.href = `${fileServerRoot}zip/${zipToken}`;
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID, tagFiles, selectedFileIds, getDownloadTarget, toggleZipDialog]);

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
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster(errMessage);
    });
  }, [repoID, renameFileCallback]);

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

  useEffect(() => {
    if (!window.sfTagsDataContext) return;

    const unsubscribeDeleteTagFiles = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.DELETE_TAG_FILES, deleteTagFiles);
    const unsubscribeDownloadTagFiles = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.DOWNLOAD_TAG_FILES, downloadTagFiles);

    return () => {
      unsubscribeDeleteTagFiles && unsubscribeDeleteTagFiles();
      unsubscribeDownloadTagFiles && unsubscribeDownloadTagFiles();
    };
  }, [deleteTagFiles, downloadTagFiles]);

  return (
    <TagViewContext.Provider value={{
      isLoading,
      errorMessage,
      tagFiles,
      repoID,
      tagID,
      repoInfo: params.repoInfo,
      updateCurrentDirent: params.updateCurrentDirent,
      isMoveDialogOpen: isMoveDialogOpen,
      isCopyDialogOpen: isCopyDialogOpen,
      isZipDialogOpen: isZipDialogOpen,
      toggleMoveDialog: toggleMoveDialog,
      toggleCopyDialog: toggleCopyDialog,
      toggleZipDialog: toggleZipDialog,
      moveTagFile: moveTagFile,
      copyTagFile: copyTagFile,
      addFolder: addFolderCallback,
      deleteTagFiles: deleteTagFiles,
      downloadTagFiles: downloadTagFiles,
      renameTagFile: renameTagFile,
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
