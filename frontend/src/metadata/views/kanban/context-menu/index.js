import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../../../components/context-menu';
import RenameDialog from '../../../components/dialog/rename-dialog';
import ZipDownloadDialog from '../../../../components/dialog/zip-download-dialog';
import { getRowById } from '../../../../components/sf-table/utils/table';
import { checkIsDir } from '../../../utils/row';
import { getFileNameFromRecord, getParentDirFromRecord } from '../../../utils/cell';
import { gettext, useGoFileserver, fileServerRoot } from '../../../../utils/constants';
import { openInNewTab, openParentFolder, downloadFile } from '../../../utils/file';
import { useMetadataView } from '../../../hooks/metadata-view';
import { PRIVATE_COLUMN_KEY } from '../../../constants';
import { Utils } from '../../../../utils/utils';
import toaster from '../../../../components/toast';
import metadataAPI from '../../../api';

const CONTEXT_MENU_KEY = {
  OPEN_IN_NEW_TAB: 'open_in_new_tab',
  OPEN_PARENT_FOLDER: 'open_parent_folder',
  DOWNLOAD: 'download',
  DELETE: 'delete',
  RENAME: 'rename',
};

const KanbanContextMenu = ({ selectedCard, onDelete, onRename }) => {
  const [isRenameDialogShow, setIsRenameDialogShow] = useState(false);
  const [isZipDialogOpen, setIsZipDialogOpen] = useState(false);

  const { metadata } = useMetadataView();

  const selectedRecord = useMemo(() => getRowById(metadata, selectedCard), [metadata, selectedCard]);
  const isDir = useMemo(() => checkIsDir(selectedRecord), [selectedRecord]);
  const oldName = useMemo(() => getFileNameFromRecord(selectedRecord), [selectedRecord]);
  const parentDir = useMemo(() => getParentDirFromRecord(selectedRecord), [selectedRecord]);

  const repoID = window.sfMetadataContext.getSetting('repoID');
  const checkCanDeleteRow = window.sfMetadataContext.checkCanDeleteRow();
  const canModifyRow = window.sfMetadataContext.canModifyRow();

  const options = useMemo(() => {
    let validOptions = [
      { value: CONTEXT_MENU_KEY.OPEN_IN_NEW_TAB, label: isDir ? gettext('Open folder in new tab') : gettext('Open file in new tab') },
      { value: CONTEXT_MENU_KEY.OPEN_PARENT_FOLDER, label: gettext('Open parent folder') },
      { value: CONTEXT_MENU_KEY.DOWNLOAD, label: gettext('Download') },
    ];
    if (checkCanDeleteRow) {
      validOptions.push({ value: CONTEXT_MENU_KEY.DELETE, label: isDir ? gettext('Delete folder') : gettext('Delete file') });
    }
    if (canModifyRow) {
      validOptions.push({ value: CONTEXT_MENU_KEY.RENAME, label: isDir ? gettext('Rename folder') : gettext('Rename file') });
    }

    return validOptions;
  }, [isDir, checkCanDeleteRow, canModifyRow]);

  const closeZipDialog = useCallback(() => {
    setIsZipDialogOpen(false);
  }, []);

  const openRenameDialog = useCallback(() => {
    setIsRenameDialogShow(true);
  }, []);

  const handleRename = useCallback((newName) => {
    if (!selectedCard) return;
    const record = getRowById(metadata, selectedCard);
    if (!record) return;

    const oldName = getFileNameFromRecord(record);
    const updates = { [PRIVATE_COLUMN_KEY.FILE_NAME]: newName };
    const oldRowData = { [PRIVATE_COLUMN_KEY.FILE_NAME]: oldName };
    onRename(selectedCard, updates, oldRowData, updates, oldRowData, {
      success_callback: () => setIsRenameDialogShow(false),
    });
  }, [metadata, selectedCard, onRename]);

  const handelDownload = useCallback((record) => {
    if (!isDir) {
      downloadFile(repoID, record);
      return;
    }
    if (!useGoFileserver) {
      setIsZipDialogOpen(true);
      return;
    }
    const fileName = getFileNameFromRecord(record);
    metadataAPI.zipDownload(repoID, parentDir, [fileName]).then((res) => {
      const zipToken = res.data['zip_token'];
      location.href = `${fileServerRoot}zip/${zipToken}`;
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID, isDir, parentDir]);

  const handleOptionClick = useCallback((option) => {
    if (!selectedCard) return;
    const record = getRowById(metadata, selectedCard);
    if (!record) return;

    switch (option.value) {
      case CONTEXT_MENU_KEY.OPEN_IN_NEW_TAB: {
        openInNewTab(repoID, record);
        break;
      }
      case CONTEXT_MENU_KEY.OPEN_PARENT_FOLDER: {
        openParentFolder(record);
        break;
      }
      case CONTEXT_MENU_KEY.DOWNLOAD: {
        handelDownload(record);
        break;
      }
      case CONTEXT_MENU_KEY.DELETE: {
        onDelete([selectedCard]);
        break;
      }
      case CONTEXT_MENU_KEY.RENAME: {
        openRenameDialog();
        break;
      }
      default: {
        break;
      }
    }
  }, [metadata, repoID, selectedCard, onDelete, openRenameDialog, handelDownload]);

  return (
    <>
      <ContextMenu
        options={options}
        onOptionClick={handleOptionClick}
        ignoredTriggerElements={['.sf-metadata-kanban-card']}
      />
      {isRenameDialogShow && (
        <RenameDialog
          isDir={isDir}
          oldName={oldName}
          onSubmit={handleRename}
          onCancel={() => setIsRenameDialogShow(false)}
        />
      )}
      {isZipDialogOpen && (
        <ZipDownloadDialog repoID={repoID} path={parentDir} target={[oldName]} toggleDialog={closeZipDialog}/>
      )}
    </>
  );
};

KanbanContextMenu.propTypes = {
  selectedCard: PropTypes.string,
  onDelete: PropTypes.func,
  onRename: PropTypes.func,
};

export default KanbanContextMenu;
