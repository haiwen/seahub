import React, { useCallback } from 'react';
import { gettext } from '../../utils/constants';
import { useTags } from '../../tag/hooks';
import { EVENT_BUS_TYPE } from '../../metadata/constants';

const TagFilesToolbar = () => {
  const { selectedFileIds, updateSelectedFileIds } = useTags();

  const unSelect = useCallback(() => {
    updateSelectedFileIds([]);
  }, [updateSelectedFileIds]);

  const deleteTagFiles = useCallback(() => {
    window.sfTagsDataContext && window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.DELETE_TAG_FILES);
  }, []);

  const downloadTagFiles = useCallback(() => {
    window.sfTagsDataContext && window.sfTagsDataContext.eventBus.dispatch(EVENT_BUS_TYPE.DOWNLOAD_TAG_FILES);
  }, []);

  return (
    <div className="selected-dirents-toolbar">
      <span className="cur-view-path-btn px-2" onClick={unSelect}>
        <span className="sf3-font-x-01 sf3-font mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}></span>
        <span>{selectedFileIds.length}{' '}{gettext('selected')}</span>
      </span>
      <span className="cur-view-path-btn" onClick={deleteTagFiles}>
        <span className="sf3-font-delete1 sf3-font" aria-label={gettext('Delete')} title={gettext('Delete')}></span>
      </span>
      <span className="cur-view-path-btn" onClick={downloadTagFiles}>
        <span className="sf3-font-download1 sf3-font" aria-label={gettext('Download')} title={gettext('Download')}></span>
      </span>
    </div>
  );
};

export default TagFilesToolbar;
