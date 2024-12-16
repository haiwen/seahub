import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { ModalPortal } from '@seafile/sf-metadata-ui-component';
import ContextMenu from '../../../../components/context-menu';
import { getRowById } from '../../../../utils/table';
import { checkIsDir } from '../../../../utils/row';
import { getFileNameFromRecord } from '../../../../utils/cell';
import { gettext } from '../../../../../utils/constants';
import { openInNewTab, openParentFolder, downloadFile } from '../../../../utils/file';
import { useMetadataView } from '../../../../hooks/metadata-view';
import { PRIVATE_COLUMN_KEY } from '../../../../constants';
import RenameDialog from '../../../../components/dialog/rename-dialog';

const CONTEXT_MENU_KEY = {
  OPEN_IN_NEW_TAB: 'open_in_new_tab',
  OPEN_PARENT_FOLDER: 'open_parent_folder',
  DOWNLOAD: 'download',
  DELETE: 'delete',
  RENAME: 'rename',
};

const KanbanContextmenu = ({ boundaryCoordinates, selectedCard, onDelete, onModify }) => {
  const [isRenameDialogShow, setIsRenameDialogShow] = useState(false);
  const { metadata } = useMetadataView();

  const selectedRecord = useMemo(() => getRowById(metadata, selectedCard), [metadata, selectedCard]);
  const isDir = useMemo(() => selectedRecord && checkIsDir(selectedRecord), [selectedRecord]);
  const oldName = useMemo(() => selectedRecord && getFileNameFromRecord(selectedRecord), [selectedRecord]);
  const repoID = window.sfMetadataContext.getSetting('repoID');

  const options = useMemo(() => {
    return [
      { value: CONTEXT_MENU_KEY.OPEN_IN_NEW_TAB, label: isDir ? gettext('Open folder in new tab') : gettext('Open file in new tab') },
      { value: CONTEXT_MENU_KEY.OPEN_PARENT_FOLDER, label: gettext('Open parent folder') },
      { value: CONTEXT_MENU_KEY.DOWNLOAD, label: gettext('Download') },
      { value: CONTEXT_MENU_KEY.DELETE, label: gettext('Delete') },
      { value: CONTEXT_MENU_KEY.RENAME, label: gettext('Rename') },
    ];
  }, [isDir]);

  const openRenameDialog = useCallback(() => {
    setIsRenameDialogShow(true);
  }, []);

  const handleRename = useCallback((newName) => {
    if (!selectedCard) return;
    const record = getRowById(metadata, selectedCard);
    if (!record) return;

    const rowId = selectedCard;
    const oldName = getFileNameFromRecord(record);
    const rowIds = [selectedCard];
    const updates = { [PRIVATE_COLUMN_KEY.FILE_NAME]: newName };
    const oldRowData = { [PRIVATE_COLUMN_KEY.FILE_NAME]: oldName };


    // rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, { success_callback }
    onModify(rowIds, { [rowId]: updates }, { [rowId]: updates }, { [rowId]: oldRowData }, { [rowId]: oldRowData }, {
      success_callback: () => setIsRenameDialogShow(false),
    });
  }, [metadata, selectedCard, onModify]);

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
        downloadFile(repoID, record);
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
  }, [metadata, repoID, selectedCard, onDelete, openRenameDialog]);


  return (
    <>
      <ContextMenu
        options={options}
        boundaryCoordinates={boundaryCoordinates}
        onOptionClick={handleOptionClick}
        ignoredTriggerElements={['.sf-metadata-kanban-card']}
      />
      {isRenameDialogShow && (
        <ModalPortal>
          <RenameDialog
            isDir={isDir}
            oldName={oldName}
            onSubmit={handleRename}
            onCancel={() => setIsRenameDialogShow(false)}
          />
        </ModalPortal>
      )}
    </>
  );
};

KanbanContextmenu.propTypes = {
  boundaryCoordinates: PropTypes.object,
  selectedCard: PropTypes.string,
  onDelete: PropTypes.func,
  onModify: PropTypes.func,
};

export default KanbanContextmenu;
