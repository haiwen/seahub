import React, { useState, useCallback, useEffect } from 'react';
import { EVENT_BUS_TYPE, GALLERY_DATE_MODE } from '../../constants';
import { gettext } from '../../utils';

const DateModeSetter = ({ viewID }) => {
  const [currentMode, setCurrentMode] = useState(() => {
    try {
      return localStorage.getItem(`gallery-mode-${viewID}`) || GALLERY_DATE_MODE.ALL;
    } catch (error) {
      return GALLERY_DATE_MODE.ALL;
    }
  });

  const handleModeChange = useCallback((newMode) => {
    setCurrentMode(newMode);
    localStorage.setItem(`gallery-mode-${viewID}`, newMode);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_GALLERY_MODE, newMode);
  }, [viewID]);

  useEffect(() => {
    setCurrentMode(localStorage.getItem(`gallery-mode-${viewID}`));
  }, [viewID]);

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
