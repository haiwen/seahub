import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import classNames from 'classnames';
import { useTagView, useTags } from '../../hooks';
import { gettext } from '../../../utils/constants';
import EmptyTip from '../../../components/empty-tip';
import toaster from '../../../components/toast';
import ContextMenu from '../../../components/context-menu/context-menu';
import FixedWidthTable from '../../../components/common/fixed-width-table';
import ImagePreviewer from '../../../metadata/components/cell-formatter/image-previewer';
import TagFile from './tag-file';
import TextTranslation from '../../../utils/text-translation';
import { getRecordIdFromRecord } from '../../../metadata/utils/cell';
import { Utils } from '../../../utils/utils';
import { getFileById, getFileName, getFileParentDir, getTagFileOperationList } from '../../utils/file';
import { EVENT_BUS_TYPE } from '../../../metadata/constants';
import { hideMenu, showMenu } from '../../../components/context-menu/actions';
import URLDecorator from '../../../utils/url-decorator';

import './index.css';

const TAG_FILE_CONTEXT_MENU_ID = 'tag-files-context-menu';

const TagFiles = () => {
  const { tagsData } = useTags();
  const {
    tagFiles, repoID, repoInfo, selectedFileIds, updateSelectedFileIds,
    moveTagFile, copyTagFile, deleteTagFiles, renameTagFileInDialog, renameTagFile, downloadTagFiles, convertFile,
    sortBy, sortOrder, sortFiles, openTagFileAccessLog, shareTagFile,
  } = useTagView();
  const [isImagePreviewerVisible, setImagePreviewerVisible] = useState(false);

  const currentImageRef = useRef(null);

  const canDelete = useMemo(() => window.sfTagsDataContext && window.sfTagsDataContext.canModifyTag(), []);
  const isSelectedAll = useMemo(() => {
    return selectedFileIds ? selectedFileIds.length === tagFiles.rows.length : false;
  }, [selectedFileIds, tagFiles]);

  // selectedFile
  const selectedFile = useMemo(() => {
    if (!selectedFileIds || selectedFileIds.length === 0) return null;
    return getFileById(tagFiles, selectedFileIds[0]);
  }, [selectedFileIds, tagFiles]);
  const selectedFileParentDir = useMemo(() => {
    return getFileParentDir(selectedFile);
  }, [selectedFile]);
  const selectedFileName = useMemo(() => {
    return getFileName(selectedFile);
  }, [selectedFile]);
  const selectedFilePath = useMemo(() => {
    return selectedFileParentDir && selectedFileName ? Utils.joinPath(selectedFileParentDir, selectedFileName) : '';
  }, [selectedFileParentDir, selectedFileName]);

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
    if (event.target.tagName === 'TD' && event.target.closest('td').querySelector('input[type="checkbox"]') === null) {
      updateSelectedFileIds([fileId]);
      return;
    }
    const newSelectedFileIds = selectedFileIds.includes(fileId)
      ? selectedFileIds.filter(id => id !== fileId)
      : [...selectedFileIds, fileId];
    updateSelectedFileIds(newSelectedFileIds);
  }, [selectedFileIds, updateSelectedFileIds]);

  const openImagePreview = useCallback((record) => {
    currentImageRef.current = record;
    setImagePreviewerVisible(true);
  }, []);

  const closeImagePreviewer = useCallback(() => {
    currentImageRef.current = null;
    setImagePreviewerVisible(false);
  }, []);

  const handleDeleteTagFiles = useCallback((ids) => {
    deleteTagFiles(ids);
    updateSelectedFileIds([]);
  }, [deleteTagFiles, updateSelectedFileIds]);

  const openViaClient = useCallback(() => {
    let url = URLDecorator.getUrl({ type: 'open_via_client', repoID, selectedFilePath });
    location.href = url;
  }, [repoID, selectedFilePath]);

  const onHistory = useCallback(() => {
    let url = URLDecorator.getUrl({
      type: 'file_revisions',
      repoID: repoID,
      filePath: selectedFilePath,
    });
    location.href = url;
  }, [repoID, selectedFilePath]);

  const onConvertFile = useCallback((dstType) => {
    toaster.notifyInProgress(gettext('Converting, please wait...'), { 'id': 'conversion' });
    convertFile(selectedFilePath, dstType);
  }, [selectedFilePath, convertFile]);

  const exportDocx = useCallback((dirent) => {
    const serviceUrl = window.app.config.serviceURL;
    const exportToDocxUrl = serviceUrl + '/repo/sdoc_export_to_docx/' + repoID + '/?file_path=' + selectedFilePath;
    window.location.href = exportToDocxUrl;
  }, [repoID, selectedFilePath]);

  const exportSdoc = useCallback((dirent) => {
    const serviceUrl = window.app.config.serviceURL;
    const exportToSdocUrl = serviceUrl + '/lib/' + repoID + '/file/' + selectedFilePath + '?dl=1';
    window.location.href = exportToSdocUrl;
  }, [repoID, selectedFilePath]);

  const getMenuContainerSize = useCallback(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }, []);

  const getMenuList = useCallback((file) => {
    const { DOWNLOAD, DELETE } = TextTranslation;
    if (selectedFileIds.length > 1) {
      return [DOWNLOAD, DELETE];
    }
    const canModify = window.sfTagsDataContext && window.sfTagsDataContext.canModify();
    const fileName = file ? getFileName(file) : selectedFileName;
    return getTagFileOperationList(fileName, repoInfo, canModify);
  }, [selectedFileIds, selectedFileName, repoInfo]);

  const onMenuItemClick = useCallback((option) => {
    if (!option) return;
    switch (option) {
      case TextTranslation.MOVE.key:
        moveTagFile();
        break;
      case TextTranslation.COPY.key:
        copyTagFile();
        break;
      case TextTranslation.DELETE.key:
        handleDeleteTagFiles();
        break;
      case TextTranslation.SHARE.key:
        shareTagFile();
        break;
      case TextTranslation.DOWNLOAD.key:
        downloadTagFiles();
        break;
      case TextTranslation.RENAME.key:
        window.sfTagsDataContext && window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.RENAME_TAG_FILE_IN_SITU, selectedFileIds[0]);
        break;
      case TextTranslation.CONVERT_TO_SDOC.key:
        onConvertFile('sdoc');
        break;
      case TextTranslation.CONVERT_TO_MARKDOWN.key: {
        onConvertFile('markdown');
        break;
      }
      case TextTranslation.CONVERT_TO_DOCX.key: {
        onConvertFile('docx');
        break;
      }
      case TextTranslation.EXPORT_DOCX.key: {
        exportDocx();
        break;
      }
      case TextTranslation.EXPORT_SDOC.key: {
        exportSdoc();
        break;
      }
      case TextTranslation.HISTORY.key:
        onHistory();
        break;
      case TextTranslation.ACCESS_LOG.key:
        openTagFileAccessLog();
        break;
      case TextTranslation.OPEN_VIA_CLIENT.key:
        openViaClient();
        break;
      default:
        break;
    }
    hideMenu();
  }, [moveTagFile, copyTagFile, handleDeleteTagFiles, downloadTagFiles, selectedFileIds, onConvertFile, exportDocx, exportSdoc, shareTagFile, openViaClient, onHistory, openTagFileAccessLog]);

  const onTagFileContextMenu = useCallback((event, file) => {
    let menuList = [];
    if (selectedFileIds.length <= 1) {
      const fileId = getRecordIdFromRecord(file);
      updateSelectedFileIds([fileId]);
      menuList = getMenuList(file);
    } else {
      menuList = getMenuList();
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
  }, [selectedFileIds, updateSelectedFileIds, getMenuList]);

  const onSortName = useCallback((e) => {
    e.preventDefault();
    const sortBy = 'name';
    const order = sortOrder == 'asc' ? 'desc' : 'asc';
    sortFiles({ sort_by: sortBy, order });
  }, [sortOrder, sortFiles]);

  const onSortSize = useCallback((e) => {
    e.preventDefault();
    const sortBy = 'size';
    const order = sortOrder == 'asc' ? 'desc' : 'asc';
    sortFiles({ sort_by: sortBy, order });
  }, [sortOrder, sortFiles]);

  const onSortTime = useCallback((e) => {
    e.preventDefault();
    const sortBy = 'time';
    const order = sortOrder == 'asc' ? 'desc' : 'asc';
    sortFiles({ sort_by: sortBy, order });
  }, [sortOrder, sortFiles]);

  useEffect(() => {
    if (!window.sfTagsDataContext) return;
    const unsubscribeUnselectFiles = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.UNSELECT_TAG_FILES, () => updateSelectedFileIds([]));
    const unsubscribeDeleteTagFiles = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.DELETE_TAG_FILES, deleteTagFiles);
    const unsubScribeMoveTagFile = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.MOVE_TAG_FILE, moveTagFile);
    const unsubScribeCopyTagFile = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.COPY_TAG_FILE, copyTagFile);
    const unsubscribeShareTagFile = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.SHARE_TAG_FILE, shareTagFile);
    const unsubscribeRenameTagFile = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.RENAME_TAG_FILE_IN_DIALOG, renameTagFileInDialog);
    const unsubscribeDownloadTagFiles = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.DOWNLOAD_TAG_FILES, downloadTagFiles);
    const unsubscribeFileHistory = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.FILE_HISTORY, onHistory);
    const unsubscribeFileAccessLog = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.FILE_ACCESS_LOG, openTagFileAccessLog);
    const unsubscribeOpenViaClient = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.OPEN_VIA_CLIENT, openViaClient);
    const unsubscribeConvertFile = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.CONVERT_FILE, onConvertFile);
    const unsubscribeExportDocx = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.EXPORT_DOCX, exportDocx);
    const unsubscribeExportSDoc = window.sfTagsDataContext.eventBus.subscribe(EVENT_BUS_TYPE.EXPORT_SDOC, exportSdoc);

    return () => {
      unsubscribeUnselectFiles();
      unsubscribeDeleteTagFiles();
      unsubScribeMoveTagFile();
      unsubScribeCopyTagFile();
      unsubscribeShareTagFile();
      unsubscribeRenameTagFile();
      unsubscribeDownloadTagFiles();
      unsubscribeFileHistory();
      unsubscribeFileAccessLog();
      unsubscribeOpenViaClient();
      unsubscribeConvertFile();
      unsubscribeExportDocx();
      unsubscribeExportSDoc();
    };
  });

  if (tagFiles.rows.length === 0) {
    return (<EmptyTip text={gettext('No files')} />);
  }

  const sortIcon = <span className={`sf3-font sf3-font-down ${sortOrder == 'asc' ? 'rotate-180 d-inline-block' : ''}`}></span>;
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
      children: (
        <a className="d-block table-sort-op" href="#" onClick={onSortName}>
          {gettext('Name')} {sortBy == 'name' && sortIcon}
        </a>
      ),
    }, {
      isFixed: false,
      width: 0.06,
    }, {
      isFixed: false,
      width: 0.18,
    }, {
      isFixed: false,
      width: 0.11,
      children: (
        <a className="d-block table-sort-op" href="#" onClick={onSortSize}>
          {gettext('Size')} {sortBy == 'size' && sortIcon}
        </a>
      ),
    }, {
      isFixed: false,
      width: 0.15,
      children: (
        <a className="d-block table-sort-op" href="#" onClick={onSortTime}>
          {gettext('Last Update')} {sortBy == 'time' && sortIcon}
        </a>
      ),
    }
  ];

  const mobileHeaders = [
    { isFixed: false, width: 0.12 },
    { isFixed: false, width: 0.8 },
    { isFixed: false, width: 0.08 },
  ];

  const isDesktop = Utils.isDesktop();
  return (
    <>
      <div className="table-container" onClick={onContainerClick}>
        <FixedWidthTable
          headers={isDesktop ? headers : mobileHeaders}
          className={classNames('table-hover', { 'table-thead-hidden': !isDesktop })}
          theadOptions={isDesktop ? {
            onMouseDown: onThreadMouseDown,
            onContextMenu: onThreadContextMenu,
          } : {}}
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
                onRenameFile={renameTagFile}
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
          deleteRecords={handleDeleteTagFiles}
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
