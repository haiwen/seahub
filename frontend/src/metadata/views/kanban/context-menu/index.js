import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../../../components/context-menu';
import RenameDialog from '../../../components/dialog/rename-dialog';
import { getRowById } from '../../../../components/sf-table/utils/table';
import { checkIsDir } from '../../../utils/row';
import { getFileNameFromRecord, getParentDirFromRecord } from '../../../utils/cell';
import { gettext } from '../../../../utils/constants';
import { openInNewTab, openParentFolder } from '../../../utils/file';
import { useMetadataView } from '../../../hooks/metadata-view';
import { PRIVATE_COLUMN_KEY } from '../../../constants';
import { useDownloadFile } from '../../../../hooks/download-file';

const CONTEXT_MENU_KEY = {
  OPEN_IN_NEW_TAB: 'open_in_new_tab',
  OPEN_PARENT_FOLDER: 'open_parent_folder',
  DOWNLOAD: 'download',
  DELETE: 'delete',
  RENAME: 'rename',
};

const KanbanContextMenu = ({ selectedCard, onDelete, onRename }) => {
  const [isRenameDialogShow, setIsRenameDialogShow] = useState(false);

  const { metadata } = useMetadataView();
  const { handelDownload: handelDownloadAPI } = useDownloadFile();

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

  const handelDownload = useCallback(() => {
    handelDownloadAPI(parentDir, [{ name: oldName, is_dir: isDir }]);
  }, [handelDownloadAPI, parentDir, oldName, isDir]);

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
    </>
  );
};

KanbanContextMenu.propTypes = {
  selectedCard: PropTypes.string,
  onDelete: PropTypes.func,
  onRename: PropTypes.func,
};

export default KanbanContextMenu;
