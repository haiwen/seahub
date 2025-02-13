import React, { useCallback, useMemo } from 'react';
import ContextMenu from '../../../components/context-menu';
import { gettext } from '../../../../utils/constants';
import { EVENT_BUS_TYPE } from '../../../../metadata/constants';

const TagFilesContextMenu = ({ selectedFileIds, downloadTagFiles, deleteTagFiles, toggleMoveDialog, toggleCopyDialog }) => {
  const options = useMemo(() => {
    if (!selectedFileIds || selectedFileIds.length === 0) return [];
    if (selectedFileIds.length === 1) {
      return [
        { value: 'download', label: gettext('Download') },
        { value: 'delete', label: gettext('Delete') },
        'Divider',
        { value: 'rename', label: gettext('Rename') },
        { value: 'move', label: gettext('Move') },
        { value: 'copy', label: gettext('Copy') },
      ];
    } else {
      return [
        { value: 'download', label: gettext('Download') },
        { value: 'delete', label: gettext('Delete') },
      ];
    }
  }, [selectedFileIds]);

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
        deleteTagFiles();
        break;
      case 'download':
        downloadTagFiles();
        break;
      case 'rename':
        window.sfTagsDataContext && window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.RENAME_TAG_FILE, selectedFileIds[0]);
        break;
      default:
        break;
    }
  }, [toggleMoveDialog, toggleCopyDialog, deleteTagFiles, downloadTagFiles, selectedFileIds]);

  return (
    <ContextMenu options={options} onOptionClick={onOptionClick} />
  );
};

export default TagFilesContextMenu;
