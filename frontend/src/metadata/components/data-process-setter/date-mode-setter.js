import React, { useState, useCallback, useEffect } from 'react';
import { EVENT_BUS_TYPE, GALLERY_DATE_MODE } from '../../constants';
import { gettext } from '../../utils';

const DateModeSetter = ({ view }) => {
  const [currentMode, setCurrentMode] = useState(() => {
    const savedValue = window.sfMetadataContext.localStorage.getItem(`gallery-mode-${view?._id}`, GALLERY_DATE_MODE.ALL);
    return savedValue || GALLERY_DATE_MODE.ALL;
  });

  const handleModeChange = useCallback((newMode) => {
    setCurrentMode(newMode);
    window.sfMetadataContext.localStorage.setItem(`gallery-mode-${view?._id}`, newMode);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_GALLERY_MODE, newMode);
  }, [view?._id]);

  useEffect(() => {
    const savedValue = window.sfMetadataContext.localStorage.getItem(`gallery-mode-${view?._id}`, GALLERY_DATE_MODE.ALL);
    setCurrentMode(savedValue || GALLERY_DATE_MODE.ALL);
  }, [view?._id]);

  return (
    <div className="metadata-date-mode-setter">
      {Object.values(GALLERY_DATE_MODE).map((dateMode) => (
        <button
          key={dateMode}
          className={`metadata-date-mode-button ${currentMode === dateMode ? 'active' : ''}`}
          onClick={() => handleModeChange(dateMode)}
        >
          <span>{gettext('dateMode').replace('dateMode', dateMode.charAt(0).toUpperCase() + dateMode.slice(1))}</span>
        </button>
      ))}
    </div>
  );
};

export default DateModeSetter;
