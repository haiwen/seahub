import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { EVENT_BUS_TYPE, GALLERY_DATE_MODE } from '../../../constants';
import { gettext } from '../../../utils';

import './index.css';

const DATE_MODE_MAP = {
  [GALLERY_DATE_MODE.YEAR]: gettext('Year'),
  [GALLERY_DATE_MODE.MONTH]: gettext('Month'),
  [GALLERY_DATE_MODE.DAY]: gettext('Day'),
  [GALLERY_DATE_MODE.ALL]: gettext('All')
};

const DateModeSetter = ({ view }) => {
  const [currentMode, setCurrentMode] = useState(GALLERY_DATE_MODE.DAY);

  useEffect(() => {
    const savedValue = window.sfMetadataContext.localStorage.getItem('gallery-mode', GALLERY_DATE_MODE.DAY);
    setCurrentMode(savedValue || GALLERY_DATE_MODE.DAY);
  }, [view?._id]);

  const handleModeChange = useCallback((newMode) => {
    setCurrentMode(newMode);
    window.sfMetadataContext.localStorage.setItem('gallery-mode', newMode);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_GALLERY_MODE, newMode);
  }, []);

  return (
    <div className="metadata-date-mode-setter">
      {Object.entries(DATE_MODE_MAP).map(([dateMode, label]) => (
        <div
          key={dateMode}
          className={classnames('metadata-date-mode-button', { active: currentMode === dateMode })}
          onClick={() => handleModeChange(dateMode)}
        >
          {label}
        </div>
      ))}
    </div>
  );
};

DateModeSetter.propTypes = {
  view: PropTypes.shape({
    _id: PropTypes.string
  })
};

export default DateModeSetter;
