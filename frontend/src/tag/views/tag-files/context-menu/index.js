import React, { useCallback, useMemo, useState } from 'react';
import ContextMenu from '../../../components/context-menu';
import { fileServerRoot, gettext, useGoFileserver } from '../../../../utils/constants';
import { ModalPortal } from '@seafile/sf-metadata-ui-component';
import ZipDownloadDialog from '../../../../components/dialog/zip-download-dialog';
import CopyDirent from '../../../../components/dialog/copy-dirent-dialog';
import MoveDirent from '../../../../components/dialog/move-dirent-dialog';
import { getFileById } from '../../../utils/file';
import { TAG_FILE_KEY } from '../../../constants/file';
import { Utils } from '../../../../utils/utils';
import URLDecorator from '../../../../utils/url-decorator';
import tagsAPI from '../../../api';
import toaster from '../../../../components/toast';

const TagFilesContextMenu = ({ repoID, repoInfo, tagFiles, selectedFileIds, reSelectFiles, moveTagFile, copyTagFile, addFolder, renameTagFile, deleteTagFiles }) => {
  const [isMoveDialogShow, setIsMoveDialogShow] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isZipDialogOpen, setIsZipDialogOpen] = useState(false);

  const selectedFile = useMemo(() => {
    if (!selectedFileIds || selectedFileIds.length === 0) return null;
    return getFileById(tagFiles, selectedFileIds[0]);
  }, [selectedFileIds, tagFiles]);

  // Determine the options based on the number of selected files
  const options = useMemo(() => {
    if (!selectedFileIds || selectedFileIds.length === 0) return [];
    if (selectedFileIds.length === 1) {
      // Show move, copy, delete, download options for single-selection
      return [
        { value: 'download', label: gettext('Download') },
        { value: 'delete', label: gettext('Delete') },
        'Divider',
        { value: 'rename', label: gettext('Rename') },
        { value: 'move', label: gettext('Move') },
        { value: 'copy', label: gettext('Copy') },
      ];
    } else {
      // Show delete, download options for multi-selection
      return [
        { value: 'download', label: gettext('Download') },
        { value: 'delete', label: gettext('Delete') },
      ];
    }
  }, [selectedFileIds]);

  const handleDelete = useCallback(() => {
    const files = selectedFileIds.map(id => getFileById(tagFiles, id));
    const paths = files.map(f => Utils.joinPath(f[TAG_FILE_KEY.PARENT_DIR], f[TAG_FILE_KEY.NAME]));
    const fileNames = files.map(f => f[TAG_FILE_KEY.NAME]);
    deleteTagFiles && deleteTagFiles(paths, fileNames);
  }, [tagFiles, selectedFileIds, deleteTagFiles]);

  const getDownloadTarget = useCallback(() => {
    if (!selectedFileIds.length) return [];
    return selectedFileIds.map(id => {
      const file = getFileById(tagFiles, id);
      const path = file[TAG_FILE_KEY.PARENT_DIR] === '/' ? file[TAG_FILE_KEY.NAME] : `${file[TAG_FILE_KEY.PARENT_DIR]}/${file[TAG_FILE_KEY.NAME]}`;
      return path;
    });
  }, [tagFiles, selectedFileIds]);

  const handleDownload = useCallback(() => {
    if (!selectedFileIds.length) return;
    if (selectedFileIds.length === 1) {
      const file = getFileById(tagFiles, selectedFileIds[0]);
      const filePath = Utils.joinPath(file[TAG_FILE_KEY.PARENT_DIR], file[TAG_FILE_KEY.NAME]);
      const url = URLDecorator.getUrl({ type: 'download_file_url', repoID, filePath });
      location.href = url;
      return;
    }
    if (!useGoFileserver) {
      setIsZipDialogOpen(true);
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
  }, [repoID, tagFiles, selectedFileIds, getDownloadTarget]);

  const toggleMoveDialog = useCallback(() => {
    setIsMoveDialogShow(!isMoveDialogShow);
  }, [isMoveDialogShow]);

  const toggleCopyDialog = useCallback(() => {
    setIsCopyDialogOpen(!isCopyDialogOpen);
  }, [isCopyDialogOpen]);

  const toggleZipDialog = () => {
    setIsZipDialogOpen(false);
  };

  const onOptionClick = useCallback((option) => {
    if (!option) return;
    switch (option.value) {
      case 'move':
        toggleMoveDialog();
        break;
      case 'copy':
        toggleCopyDialog();
        break;
      case 'delete':
        handleDelete();
        break;
      case 'download':
        handleDownload();
        break;
      default:
        break;
    }
  }, [toggleMoveDialog, toggleCopyDialog, handleDelete, handleDownload]);

  const isEncrypted = repoInfo.encrypted;
  return (
    <>
      <ContextMenu options={options} onOptionClick={onOptionClick} />
      {isMoveDialogShow && (
        <ModalPortal>
          <MoveDirent
            path={selectedFile[TAG_FILE_KEY.PARENT_DIR]}
            repoID={repoID}
            repoEncrypted={isEncrypted}
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
            repoEncrypted={isEncrypted}
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
    </>
  );
};

export default TagFilesContextMenu;
