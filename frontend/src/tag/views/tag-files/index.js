import React, { useCallback, useState, useRef, useMemo } from 'react';
import { ModalPortal } from '@seafile/sf-metadata-ui-component';
import { useTagView, useTags } from '../../hooks';
import { gettext, username } from '../../../utils/constants';
import TagFile from './tag-file';
import { getRecordIdFromRecord } from '../../../metadata/utils/cell';
import EmptyTip from '../../../components/empty-tip';
import ImagePreviewer from '../../../metadata/components/cell-formatter/image-previewer';
import FixedWidthTable from '../../../components/common/fixed-width-table';
import TagFilesContextMenu from './context-menu';
import { seafileAPI } from '../../../utils/seafile-api';
import { TAG_FILE_KEY } from '../../constants/file';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import MoveDirent from '../../../components/dialog/move-dirent-dialog';
import CopyDirent from '../../../components/dialog/copy-dirent-dialog';
import ZipDownloadDialog from '../../../components/dialog/zip-download-dialog';
import ShareDialog from '../../../components/dialog/share-dialog';
import { getFileById } from '../../utils/file';
import Rename from '../../../components/dialog/rename-dirent';

import './index.css';

const TagFiles = () => {
  const { tagFiles, repoID, repoInfo,
    isMoveDialogOpen, isCopyDialogOpen, isZipDialogOpen, isShareDialogOpen, isRenameDialogOpen,
    toggleMoveDialog, toggleCopyDialog, toggleZipDialog, toggleShareDialog, toggleRenameDialog,
    moveTagFile, copyTagFile, addFolder, downloadTagFiles, deleteTagFiles, renameTagFile } = useTagView();
  const { tagsData, selectedFileIds, updateSelectedFileIds } = useTags();
  const [isImagePreviewerVisible, setImagePreviewerVisible] = useState(false);

  const currentImageRef = useRef(null);

  const isSelectedAll = useMemo(() => {
    return selectedFileIds ? selectedFileIds.length === tagFiles.rows.length : false;
  }, [selectedFileIds, tagFiles]);

  const selectedFile = useMemo(() => {
    if (!selectedFileIds || selectedFileIds.length === 0) return null;
    return getFileById(tagFiles, selectedFileIds[0]);
  }, [selectedFileIds, tagFiles]);

  const getDownloadTarget = useCallback(() => {
    if (!selectedFileIds.length) return [];
    return selectedFileIds.map(id => {
      const file = getFileById(tagFiles, id);
      const path = file[TAG_FILE_KEY.PARENT_DIR] === '/' ? file[TAG_FILE_KEY.NAME] : `${file[TAG_FILE_KEY.PARENT_DIR]}/${file[TAG_FILE_KEY.NAME]}`;
      return path;
    });
  }, [tagFiles, selectedFileIds]);

  const onMouseDown = useCallback((event) => {
    if (event.button === 2) {
      event.stopPropagation();
      return;
    }
  }, []);

  const onThreadMouseDown = useCallback((event) => {
    onMouseDown(event);
  }, [onMouseDown]);

  const onThreadContextMenu = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const onSelectedAll = useCallback(() => {
    if (isSelectedAll) {
      updateSelectedFileIds([]);
    } else {
      const allIds = tagFiles.rows.map(record => getRecordIdFromRecord(record));
      updateSelectedFileIds(allIds);
    }
  }, [tagFiles, isSelectedAll, updateSelectedFileIds]);

  const onContainerClick = (event) => {
    if (selectedFileIds.length > 0) updateSelectedFileIds([]);
  };

  const onSelectFile = useCallback((event, fileId) => {
    if (event.button === 0) {
      let newSelectedFiles = selectedFileIds ? selectedFileIds.slice(0) : [];
      if (newSelectedFiles.includes(fileId)) {
        newSelectedFiles = newSelectedFiles.filter(item => item !== fileId);
      } else {
        newSelectedFiles.push(fileId);
      }
      if (newSelectedFiles.length > 0) {
        updateSelectedFileIds(newSelectedFiles);
      } else {
        updateSelectedFileIds([]);
      }
    } else if (event.button === 2) {
      if (selectedFileIds.length <= 1) {
        updateSelectedFileIds([fileId]);
      }
    }
  }, [selectedFileIds, updateSelectedFileIds]);

  const reSelectFiles = useCallback((fileIds) => {
    updateSelectedFileIds(fileIds);
  }, [updateSelectedFileIds]);

  const openImagePreview = useCallback((record) => {
    currentImageRef.current = record;
    setImagePreviewerVisible(true);
  }, []);

  const closeImagePreviewer = useCallback(() => {
    currentImageRef.current = null;
    setImagePreviewerVisible(false);
  }, []);

  const handleDeleteTagFiles = useCallback(() => {
    deleteTagFiles();
    updateSelectedFileIds([]);
  }, [deleteTagFiles, updateSelectedFileIds]);

  const handleRenameTagFile = useCallback((newName) => {
    const path = selectedFile[TAG_FILE_KEY.PARENT_DIR];
    seafileAPI.listDir(repoID, path).then(res => {
      const fileList = res.data.dirent_list.filter(dirent => dirent.type === 'file');
      const isDuplicated = fileList.some(file => file.name === newName);
      if (isDuplicated) {
        let errMessage = gettext('The name "{name}" is already taken. Please choose a different name.');
        errMessage = errMessage.replace('{name}', Utils.HTMLescape(newName));
        toaster.danger(errMessage);
        return false;
      }
      const fullPath = Utils.joinPath(path, selectedFile[TAG_FILE_KEY.NAME]);
      renameTagFile(selectedFile[TAG_FILE_KEY.ID], fullPath, newName);
    });
  }, [repoID, selectedFile, renameTagFile]);

  if (tagFiles.rows.length === 0) {
    return (<EmptyTip text={gettext('No files')} />);
  }

  const headers = [
    {
      isFixed: true,
      width: 31,
      className: 'pl10 pr-2',
      children: (
        <input
          type="checkbox"
          className="vam"
          onChange={onSelectedAll}
          checked={isSelectedAll}
          title={isSelectedAll ? gettext('Unselect all') : gettext('Select all')}
          disabled={tagFiles.rows.length === 0}
        />
      )
    }, {
      isFixed: true,
      width: 41,
      className: 'pl-2 pr-2',
    }, {
      isFixed: false,
      width: 0.5,
      children: (<a className="d-block table-sort-op" href="#">{gettext('Name')}</a>),
    }, {
      isFixed: false,
      width: 0.06,
    }, {
      isFixed: false,
      width: 0.18,
    }, {
      isFixed: false,
      width: 0.11,
      children: (<a className="d-block table-sort-op" href="#">{gettext('Size')}</a>),
    }, {
      isFixed: false,
      width: 0.15,
      children: (<a className="d-block table-sort-op" href="#">{gettext('Last Update')}</a>),
    }
  ];

  let enableDirPrivateShare = false;
  let isRepoOwner = repoInfo.owner_email === username;
  let isVirtual = repoInfo.is_virtual;
  let isAdmin = repoInfo.is_admin;
  if (!isVirtual && (isRepoOwner || isAdmin)) {
    enableDirPrivateShare = true;
  }
  const isGroupOwnedRepo = repoInfo.owner_email.includes('@seafile_group');
  return (
    <>
      <div className="table-container" onClick={onContainerClick}>
        <FixedWidthTable
          headers={headers}
          className="table-hover"
          theadOptions={{
            onMouseDown: onThreadMouseDown,
            onContextMenu: onThreadContextMenu,
          }}
        >
          {tagFiles.rows.map(file => {
            const fileId = getRecordIdFromRecord(file);
            return (
              <TagFile
                key={fileId}
                repoID={repoID}
                isSelected={selectedFileIds ? selectedFileIds.includes(fileId) : false}
                file={file}
                tagsData={tagsData}
                onSelectFile={onSelectFile}
                reSelectFiles={reSelectFiles}
                openImagePreview={openImagePreview}
                onRenameFile={handleRenameTagFile}
              />);
          })}
        </FixedWidthTable>
      </div>
      {isImagePreviewerVisible && (
        <ImagePreviewer
          repoID={repoID}
          repoInfo={repoInfo}
          record={currentImageRef.current}
          table={tagFiles}
          closeImagePopup={closeImagePreviewer}
        />
      )}
      <TagFilesContextMenu
        repoID={repoID}
        repoInfo={repoInfo}
        tagFiles={tagFiles}
        selectedFileIds={selectedFileIds}
        reSelectFiles={reSelectFiles}
        downloadTagFiles={downloadTagFiles}
        deleteTagFiles={handleDeleteTagFiles}
        toggleMoveDialog={toggleMoveDialog}
        toggleCopyDialog={toggleCopyDialog}
        toggleZipDialog={toggleZipDialog}
        toggleShareDialog={toggleShareDialog}
      />
      {isMoveDialogOpen && (
        <ModalPortal>
          <MoveDirent
            path={selectedFile[TAG_FILE_KEY.PARENT_DIR]}
            repoID={repoID}
            repoEncrypted={repoInfo.encrypted}
            isMultipleOperation={false}
            dirent={{ name: selectedFile[TAG_FILE_KEY.NAME] }}
            onItemMove={moveTagFile}
            onCancelMove={toggleMoveDialog}
            onAddFolder={addFolder}
          />
        </ModalPortal>
      )}
      {isCopyDialogOpen && (
        <ModalPortal>
          <CopyDirent
            path={selectedFile[TAG_FILE_KEY.PARENT_DIR]}
            repoID={repoID}
            repoEncrypted={repoInfo.encrypted}
            isMultipleOperation={false}
            dirent={{ name: selectedFile[TAG_FILE_KEY.NAME] }}
            onItemCopy={copyTagFile}
            onCancelCopy={toggleCopyDialog}
            onAddFolder={addFolder}
          />
        </ModalPortal>
      )}
      {isZipDialogOpen && (
        <ModalPortal>
          <ZipDownloadDialog
            repoID={repoID}
            path="/"
            target={getDownloadTarget()}
            toggleDialog={toggleZipDialog}
          />
        </ModalPortal>
      )}
      {isShareDialogOpen &&
        <ModalPortal>
          <ShareDialog
            itemType='file'
            itemName={selectedFile[TAG_FILE_KEY.NAME]}
            itemPath={Utils.joinPath(selectedFile[TAG_FILE_KEY.NAME], selectedFile[TAG_FILE_KEY.PARENT_DIR])}
            userPerm={repoInfo.permission}
            repoID={repoID}
            repoEncrypted={repoInfo.repoEncrypted}
            enableDirPrivateShare={enableDirPrivateShare}
            isGroupOwnedRepo={isGroupOwnedRepo}
            toggleDialog={toggleShareDialog}
          />
        </ModalPortal>
      }
      {isRenameDialogOpen &&
        <ModalPortal>
          <Rename
            dirent={{ name: selectedFile[TAG_FILE_KEY.NAME], type: 'file' }}
            onRename={handleRenameTagFile}
            checkDuplicatedName={() => {}}
            toggleCancel={toggleRenameDialog}
          />
        </ModalPortal>
      }
    </>
  );
};

export default TagFiles;
