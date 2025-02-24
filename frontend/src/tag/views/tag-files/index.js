import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { useTagView, useTags } from '../../hooks';
import { gettext, username } from '../../../utils/constants';
import TagFile from './tag-file';
import { getRecordIdFromRecord } from '../../../metadata/utils/cell';
import EmptyTip from '../../../components/empty-tip';
import ImagePreviewer from '../../../metadata/components/cell-formatter/image-previewer';
import FixedWidthTable from '../../../components/common/fixed-width-table';
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
import ContextMenu from '../../../components/context-menu/context-menu';
import { EVENT_BUS_TYPE } from '../../../metadata/constants';
import { hideMenu, showMenu } from '../../../components/context-menu/actions';
import TextTranslation from '../../../utils/text-translation';
import URLDecorator from '../../../utils/url-decorator';

import './index.css';

const TAG_FILE_CONTEXT_MENU_ID = 'tag-files-context-menu';

const TagFiles = () => {
  const { tagFiles, repoID, repoInfo, selectedFileIds, updateSelectedFileIds,
    moveTagFile, copyTagFile, addFolder, deleteTagFiles, renameTagFile, downloadTagFiles } = useTagView();
  const { tagsData } = useTags();

  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isZipDialogOpen, setIsZipDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
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
    hideMenu();
    if (selectedFileIds.length > 0) updateSelectedFileIds([]);
  };

  const onSelectFile = useCallback((event, fileId) => {
    if (event.target.tagName === 'TD') {
      updateSelectedFileIds([fileId]);
      return;
    }
    const newSelectedFileIds = selectedFileIds.includes(fileId)
      ? selectedFileIds.filter(id => id !== fileId)
      : [...selectedFileIds, fileId];
    updateSelectedFileIds(newSelectedFileIds);
  }, [selectedFileIds, updateSelectedFileIds]);

  const toggleMoveDialog = useCallback(() => {
    setIsMoveDialogOpen(!isMoveDialogOpen);
  }, [isMoveDialogOpen]);

  const toggleCopyDialog = useCallback(() => {
    setIsCopyDialogOpen(!isCopyDialogOpen);
  }, [isCopyDialogOpen]);

  const toggleZipDialog = useCallback(() => {
    setIsZipDialogOpen(!isZipDialogOpen);
  }, [isZipDialogOpen]);

  const toggleShareDialog = useCallback(() => {
    setIsShareDialogOpen(!isShareDialogOpen);
  }, [isShareDialogOpen]);

  const toggleRenameDialog = useCallback(() => {
    setIsRenameDialogOpen(!isRenameDialogOpen);
  }, [isRenameDialogOpen]);

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
    const newPath = Utils.joinPath(path, newName);
    seafileAPI.getFileInfo(repoID, newPath).then(() => {
      let errMessage = gettext('The name "{name}" is already taken. Please choose a different name.');
      errMessage = errMessage.replace('{name}', Utils.HTMLescape(newName));
      toaster.danger(errMessage);
    }).catch(error => {
      if (error.response && error.response.status === 404) {
        const fullPath = Utils.joinPath(path, selectedFile[TAG_FILE_KEY.NAME]);
        renameTagFile(selectedFile[TAG_FILE_KEY.ID], fullPath, newName);
      } else {
        const errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      }
    });
  }, [repoID, selectedFile, renameTagFile]);

  const openViaClient = useCallback(() => {
    const filePath = Utils.joinPath(selectedFile[TAG_FILE_KEY.PARENT_DIR], selectedFile[TAG_FILE_KEY.NAME]);
    let url = URLDecorator.getUrl({ type: 'open_via_client', repoID, filePath });
    location.href = url;
  }, [repoID, selectedFile]);

  const onGetMenuContainerSize = useCallback(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }, []);

  const menuList = useMemo(() => {
    const { DOWNLOAD, SHARE, DELETE, RENAME, MOVE, COPY, OPEN_VIA_CLIENT } = TextTranslation;
    if (selectedFileIds.length > 1) {
      return [DOWNLOAD, DELETE];
    } else {
      const canModify = window.sfTagsDataContext && window.sfTagsDataContext.canModify();
      const menuList = [DOWNLOAD, SHARE];
      if (canModify) {
        menuList.push(DELETE, 'Divider', RENAME);
      }
      menuList.push(MOVE, COPY);
      if (canModify) {
        menuList.push('Divider', OPEN_VIA_CLIENT);
      }
      return menuList;
    }
  }, [selectedFileIds]);

  const onMenuItemClick = useCallback((option) => {
    if (!option) return;
    switch (option) {
      case 'Move':
        toggleMoveDialog();
        break;
      case 'Copy':
        toggleCopyDialog();
        break;
      case 'Delete':
        handleDeleteTagFiles();
        break;
      case 'Share':
        toggleShareDialog();
        break;
      case 'Download':
        downloadTagFiles();
        break;
      case 'Rename':
        window.sfTagsDataContext && window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.RENAME_TAG_FILE, selectedFileIds[0]);
        break;
      case 'Open via Client':
        openViaClient();
        break;
      default:
        break;
    }
    hideMenu();
  }, [toggleMoveDialog, toggleCopyDialog, handleDeleteTagFiles, downloadTagFiles, selectedFileIds, toggleShareDialog, openViaClient]);

  const onTagFileContextMenu = useCallback((event, file) => {
    if (selectedFileIds.length <= 1) {
      const fileId = getRecordIdFromRecord(file);
      updateSelectedFileIds([fileId]);
    }
    const id = TAG_FILE_CONTEXT_MENU_ID;
    let x = event.clientX || (event.touches && event.touches[0].pageX);
    let y = event.clientY || (event.touches && event.touches[0].pageY);

    hideMenu();

    let showMenuConfig = {
      id: id,
      position: { x, y },
      target: event.target,
      currentObject: file,
      menuList: menuList,
    };

    if (menuList.length === 0) {
      return;
    }

    showMenu(showMenuConfig);
  }, [selectedFileIds, menuList, updateSelectedFileIds]);

  useEffect(() => {
    const unsubScribeMoveTagFile = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.MOVE_TAG_FILE, toggleMoveDialog);
    const unsubScribeCopyTagFile = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.COPY_TAG_FILE, toggleCopyDialog);
    const unsubscribeShareTagFile = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.SHARE_TAG_FILE, toggleShareDialog);
    const unsubscribeRenameTagFile = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_RENAME_DIALOG, toggleRenameDialog);
    const unsubscribeZipDownload = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_ZIP_DIALOG, toggleZipDialog);

    return () => {
      unsubScribeMoveTagFile();
      unsubScribeCopyTagFile();
      unsubscribeShareTagFile();
      unsubscribeRenameTagFile();
      unsubscribeZipDownload();
    };
  });

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
  const canDelete = window.sfTagsDataContext && window.sfTagsDataContext.canModifyTag();
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
                openImagePreview={openImagePreview}
                onRenameFile={handleRenameTagFile}
                onContextMenu={onTagFileContextMenu}
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
          canDelete={canDelete}
        />
      )}
      <ContextMenu
        id={TAG_FILE_CONTEXT_MENU_ID}
        onMenuItemClick={onMenuItemClick}
        getMenuContainerSize={onGetMenuContainerSize}
      />
      {isMoveDialogOpen && (
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
      )}
      {isCopyDialogOpen && (
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
      )}
      {isZipDialogOpen && (
        <ZipDownloadDialog
          repoID={repoID}
          path="/"
          target={getDownloadTarget()}
          toggleDialog={toggleZipDialog}
        />
      )}
      {isShareDialogOpen &&
        <ShareDialog
          itemType='file'
          itemName={selectedFile[TAG_FILE_KEY.NAME]}
          itemPath={Utils.joinPath(selectedFile[TAG_FILE_KEY.PARENT_DIR], selectedFile[TAG_FILE_KEY.NAME])}
          userPerm={repoInfo.permission}
          repoID={repoID}
          repoEncrypted={repoInfo.repoEncrypted}
          enableDirPrivateShare={enableDirPrivateShare}
          isGroupOwnedRepo={isGroupOwnedRepo}
          toggleDialog={toggleShareDialog}
        />
      }
      {isRenameDialogOpen &&
        <Rename
          dirent={{ name: selectedFile[TAG_FILE_KEY.NAME], type: 'file' }}
          onRename={handleRenameTagFile}
          checkDuplicatedName={() => {}}
          toggleCancel={toggleRenameDialog}
        />
      }
    </>
  );
};

export default TagFiles;
