import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { useTagView } from '../../hooks';
import EmptyTip from '../../../components/empty-tip';
import toaster from '../../../components/toast';
import ContextMenu from '../../../components/context-menu/context-menu';
import { LIST_MODE } from '../../../components/dir-view-mode/constants';
import { hideMenu, showMenu } from '../../../components/context-menu/actions';
import { getDirentItemMenuList, getTagFilesOperations } from '../../../components/dir-view-mode/utils/contextMenuUtils';
import { menuHandlers } from '../../../components/dir-view-mode/utils/menuHandlers';
import { EVENT_BUS_TYPE } from '../../../metadata/constants';
import { getRecordIdFromRecord } from '../../../metadata/utils/cell';
import ImagePreviewer from '../../../metadata/components/cell-formatter/image-previewer';
import { Utils } from '../../../utils/utils';
import { gettext } from '../../../utils/constants';
import TextTranslation from '../../../utils/text-translation';
import {
  exportDocx,
  exportMarkdown,
  exportSdoc,
  openHistory,
  openByDefault,
  openViaClient,
  openWithOnlyOffice,
} from '../../../utils/dirent-operations';
import { getFileById, getFileName, getFileParentDir, getFileObj, filterTagFileOperations } from '../../utils/file';
import ListView from './list';
import GridView from './grid';

import './index.css';

const TAG_FILE_CONTEXT_MENU_ID = 'tag-files-context-menu';

const TagFiles = () => {
  const {
    tagFiles,
    repoID,
    repoInfo,
    selectedFileIds,
    updateSelectedFileIds,
    viewMode,
    copyTagFile,
    downloadTagFiles,
    convertFile,
    shareTagFile,
    openTagFileAccessLog,
    displayFileDetails,
  } = useTagView();

  const [isImagePreviewerVisible, setImagePreviewerVisible] = useState(false);
  const currentImageRef = useRef(null);

  const selectedFile = useMemo(() => {
    if (!selectedFileIds || selectedFileIds.length === 0) return null;
    const file = getFileById(tagFiles, selectedFileIds[0]);
    return getFileObj(file, repoInfo.is_admin);
  }, [selectedFileIds, tagFiles, repoInfo]);

  const selectedFileParentDir = useMemo(() => getFileParentDir(selectedFile), [selectedFile]);
  const selectedFilePath = useMemo(() => {
    const name = getFileName(selectedFile);
    return selectedFileParentDir && name
      ? Utils.joinPath(selectedFileParentDir, name)
      : '';
  }, [selectedFileParentDir, selectedFile]);

  const openImagePreview = useCallback((record) => {
    currentImageRef.current = record;
    setImagePreviewerVisible(true);
  }, []);

  const closeImagePreviewer = useCallback(() => {
    currentImageRef.current = null;
    setImagePreviewerVisible(false);
  }, []);

  const chatWithAIAboutTagFiles = useCallback(() => {
    if (!selectedFileIds || selectedFileIds.length === 0) return;
    const files = selectedFileIds.map((id) => {
      const file = getFileById(tagFiles, id);
      return {
        name: getFileName(file),
        parent_dir: getFileParentDir(file),
        type: 'file',
      };
    });
    menuHandlers[TextTranslation.CHAT_WITH_AI.key]({
      repoID,
      dirents: files,
      isBatch: files.length > 1,
    });
  }, [selectedFileIds, tagFiles, repoID]);

  const openWithDefault = useCallback(() => {
    openByDefault(repoID, selectedFileParentDir, selectedFile);
  }, [repoID, selectedFileParentDir, selectedFile]);

  const openWithOnlyofficeForTagFile = useCallback(() => {
    openWithOnlyOffice(repoID, selectedFileParentDir, selectedFile);
  }, [repoID, selectedFileParentDir, selectedFile]);

  const openViaClientForTagFile = useCallback(() => {
    openViaClient(repoID, selectedFileParentDir, selectedFile);
  }, [repoID, selectedFileParentDir, selectedFile]);

  const onHistory = useCallback(() => {
    openHistory(repoID, selectedFileParentDir, selectedFile);
  }, [repoID, selectedFileParentDir, selectedFile]);

  const onConvertFile = useCallback((dstType) => {
    toaster.notifyInProgress(gettext('Converting, please wait...'), { id: 'conversion' });
    convertFile(selectedFilePath, dstType);
  }, [selectedFilePath, convertFile]);

  const exportSdocAsDocx = useCallback(() => {
    exportDocx(repoID, selectedFileParentDir, selectedFile);
  }, [repoID, selectedFileParentDir, selectedFile]);

  const exportSdocAsMarkdown = useCallback(() => {
    exportMarkdown(repoID, selectedFileParentDir, selectedFile);
  }, [repoID, selectedFileParentDir, selectedFile]);

  const exportSdocAsZip = useCallback(() => {
    exportSdoc(repoID, selectedFileParentDir, selectedFile);
  }, [repoID, selectedFileParentDir, selectedFile]);

  const getMenuContainerSize = useCallback(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }), []);

  const onMenuItemClick = useCallback((option) => {
    if (!option) return;

    switch (option) {
      case TextTranslation.COPY.key:
        copyTagFile();
        break;
      case TextTranslation.SHARE.key:
        shareTagFile();
        break;
      case TextTranslation.DOWNLOAD.key:
        downloadTagFiles();
        break;
      case TextTranslation.CHAT_WITH_AI.key:
        chatWithAIAboutTagFiles();
        break;
      case TextTranslation.PROPERTIES.key:
        displayFileDetails();
        break;
      case TextTranslation.CONVERT_TO_SDOC.key:
        onConvertFile('sdoc');
        break;
      case TextTranslation.CONVERT_TO_MARKDOWN.key:
        onConvertFile('markdown');
        break;
      case TextTranslation.CONVERT_TO_DOCX.key:
        onConvertFile('docx');
        break;
      case TextTranslation.EXPORT_DOCX.key:
        exportSdocAsDocx();
        break;
      case TextTranslation.EXPORT_MARKDOWN.key:
        exportSdocAsMarkdown();
        break;
      case TextTranslation.EXPORT_SDOC.key:
        exportSdocAsZip();
        break;
      case TextTranslation.HISTORY.key:
        onHistory();
        break;
      case TextTranslation.ACCESS_LOG.key:
        openTagFileAccessLog();
        break;
      case TextTranslation.OPEN_WITH_DEFAULT.key:
        openWithDefault();
        break;
      case TextTranslation.OPEN_WITH_ONLYOFFICE.key:
        openWithOnlyofficeForTagFile();
        break;
      case TextTranslation.OPEN_VIA_CLIENT.key:
        openViaClientForTagFile();
        break;
      default:
        break;
    }
    hideMenu();
  }, [
    copyTagFile,
    shareTagFile,
    downloadTagFiles,
    chatWithAIAboutTagFiles,
    displayFileDetails,
    onConvertFile,
    exportSdocAsDocx,
    exportSdocAsMarkdown,
    exportSdocAsZip,
    onHistory,
    openTagFileAccessLog,
    openWithDefault,
    openWithOnlyofficeForTagFile,
    openViaClientForTagFile,
  ]);

  const onTagFileContextMenu = useCallback((event, file) => {
    const { is_admin: isAdmin } = repoInfo;
    let menuList = [];

    if (selectedFileIds.length <= 1) {
      updateSelectedFileIds([getRecordIdFromRecord(file)]);
      menuList = filterTagFileOperations(getDirentItemMenuList(repoInfo, getFileObj(file, isAdmin), true));
    } else {
      const selectedFiles = selectedFileIds.map((id) => getFileObj(getFileById(tagFiles, id), isAdmin));
      menuList = getTagFilesOperations(repoInfo, selectedFiles);
    }

    if (menuList.length === 0) return;

    const x = event.clientX || (event.touches && event.touches[0].pageX);
    const y = event.clientY || (event.touches && event.touches[0].pageY);

    hideMenu();
    showMenu({
      id: TAG_FILE_CONTEXT_MENU_ID,
      position: { x, y },
      target: event.target,
      currentObject: file,
      menuList,
    });
  }, [selectedFileIds, updateSelectedFileIds, repoInfo, tagFiles]);

  useEffect(() => {
    if (!window.sfTagsDataContext) return;

    const eventBus = window.sfTagsDataContext.eventBus;
    const unsubscribers = [
      eventBus.subscribe(EVENT_BUS_TYPE.UNSELECT_TAG_FILES, () => updateSelectedFileIds([])),
      eventBus.subscribe(EVENT_BUS_TYPE.COPY_TAG_FILE, copyTagFile),
      eventBus.subscribe(EVENT_BUS_TYPE.SHARE_TAG_FILE, shareTagFile),
      eventBus.subscribe(EVENT_BUS_TYPE.CHAT_WITH_AI_ABOUT_TAG_FILES, chatWithAIAboutTagFiles),
      eventBus.subscribe(EVENT_BUS_TYPE.DOWNLOAD_TAG_FILES, downloadTagFiles),
      eventBus.subscribe(EVENT_BUS_TYPE.FILE_HISTORY, onHistory),
      eventBus.subscribe(EVENT_BUS_TYPE.FILE_ACCESS_LOG, openTagFileAccessLog),
      eventBus.subscribe(EVENT_BUS_TYPE.PROPERTIES, displayFileDetails),
      eventBus.subscribe(EVENT_BUS_TYPE.OPEN_WITH_DEFAULT, openWithDefault),
      eventBus.subscribe(EVENT_BUS_TYPE.OPEN_WITH_ONLYOFFICE, openWithOnlyofficeForTagFile),
      eventBus.subscribe(EVENT_BUS_TYPE.OPEN_VIA_CLIENT, openViaClientForTagFile),
      eventBus.subscribe(EVENT_BUS_TYPE.CONVERT_FILE, onConvertFile),
      eventBus.subscribe(EVENT_BUS_TYPE.EXPORT_DOCX, exportSdocAsDocx),
      eventBus.subscribe(EVENT_BUS_TYPE.EXPORT_MARKDOWN, exportSdocAsMarkdown),
      eventBus.subscribe(EVENT_BUS_TYPE.EXPORT_SDOC, exportSdocAsZip),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    updateSelectedFileIds,
    copyTagFile,
    shareTagFile,
    chatWithAIAboutTagFiles,
    downloadTagFiles,
    onHistory,
    openTagFileAccessLog,
    displayFileDetails,
    openWithDefault,
    openWithOnlyofficeForTagFile,
    openViaClientForTagFile,
    onConvertFile,
    exportSdocAsDocx,
    exportSdocAsMarkdown,
    exportSdocAsZip,
  ]);

  if (tagFiles.rows.length === 0) {
    return <EmptyTip text={gettext('No files')} />;
  }

  return (
    <>
      {viewMode === LIST_MODE ? (
        <ListView
          repoID={repoID}
          openImagePreview={openImagePreview}
          onTagFileContextMenu={onTagFileContextMenu}
        />
      ) : (
        <GridView
          repoID={repoID}
          openImagePreview={openImagePreview}
          onTagFileContextMenu={onTagFileContextMenu}
        />
      )}
      {isImagePreviewerVisible && (
        <ImagePreviewer
          repoID={repoID}
          repoInfo={repoInfo}
          record={currentImageRef.current}
          table={tagFiles}
          closeImagePopup={closeImagePreviewer}
          canDelete={false}
          deleteRecords={() => {}}
        />
      )}
      <ContextMenu
        id={TAG_FILE_CONTEXT_MENU_ID}
        onMenuItemClick={onMenuItemClick}
        getMenuContainerSize={getMenuContainerSize}
      />
    </>
  );
};

export default TagFiles;
