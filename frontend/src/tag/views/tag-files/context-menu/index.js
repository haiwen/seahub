import React, { useCallback, useMemo } from 'react';
import ContextMenu from '../../../components/context-menu';
import { EVENT_BUS_TYPE } from '../../../../metadata/constants';
import TextTranslation from '../../../../utils/text-translation';

const TagFilesContextMenu = ({ selectedFileIds, downloadTagFiles, deleteTagFiles, toggleMoveDialog, toggleCopyDialog, toggleShareDialog }) => {
  const options = useMemo(() => {
    const { DOWNLOAD, SHARE, DELETE, RENAME, MOVE, COPY } = TextTranslation;
    if (!selectedFileIds || selectedFileIds.length === 0) return [];
    if (selectedFileIds.length === 1) {
      return [DOWNLOAD, SHARE, DELETE, 'Divider', RENAME, MOVE, COPY];
    } else {
      return [DOWNLOAD, DELETE];
    }
  }, [selectedFileIds]);

  const onOptionClick = useCallback((option) => {
    if (!option) return;
    switch (option.key) {
      case 'Move':
        toggleMoveDialog();
        break;
      case 'Copy':
        toggleCopyDialog();
        break;
      case 'Delete':
        deleteTagFiles();
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
      default:
        break;
    }
  }, [toggleMoveDialog, toggleCopyDialog, deleteTagFiles, downloadTagFiles, selectedFileIds, toggleShareDialog]);

  return (
    <ContextMenu options={options} onOptionClick={onOptionClick} />
  );
};

export default TagFilesContextMenu;
