import { useCallback, useEffect, useMemo, useState } from 'react';
import ViewModes from '../../../components/view-modes';
import { TAG_FILES_VIEW_MODE, TAG_FILES_VIEW_MODE_DEFAULT } from '../../constants/mode';
import { EVENT_BUS_TYPE } from '../../../metadata/constants';

const TagFilesViewMode = () => {
  const [mode, setMode] = useState(TAG_FILES_VIEW_MODE_DEFAULT);

  const eventBus = useMemo(() => window.sfTagsDataContext?.eventBus, []);
  const localStorage = useMemo(() => window.sfTagsDataContext?.localStorage, []);

  const switchViewMode = useCallback((mode) => {
    setMode(mode);
    localStorage && localStorage.setItem(TAG_FILES_VIEW_MODE, mode);
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_TAG_FILES_VIEW_MODE, mode);
  }, [localStorage, eventBus]);

  useEffect(() => {
    const savedViewMode = localStorage && localStorage.getItem(TAG_FILES_VIEW_MODE);
    const viewMode = savedViewMode ? savedViewMode : TAG_FILES_VIEW_MODE_DEFAULT;
    setMode(viewMode);
  }, [localStorage]);

  return (
    <ViewModes currentViewMode={mode} switchViewMode={switchViewMode} />
  );
};

export default TagFilesViewMode;
