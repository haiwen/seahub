import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { EVENT_BUS_TYPE, GALLERY_DATE_MODE } from '../../../constants';
import { gettext } from '../../../../utils/constants';

import './index.css';

const DATE_MODE_MAP = {
  [GALLERY_DATE_MODE.YEAR]: gettext('Year'),
  [GALLERY_DATE_MODE.MONTH]: gettext('Month'),
  [GALLERY_DATE_MODE.DAY]: gettext('Day'),
  [GALLERY_DATE_MODE.ALL]: gettext('All')
};

const GalleryGroupBySetter = ({ view }) => {
  const [currentMode, setCurrentMode] = useState(GALLERY_DATE_MODE.DAY);

  useEffect(() => {
    const savedValue = window.sfMetadataContext.localStorage.getItem('gallery-group-by', GALLERY_DATE_MODE.DAY);
    setCurrentMode(savedValue || GALLERY_DATE_MODE.DAY);
  }, [view?._id]);

  const handleGroupByChange = useCallback((newMode) => {
    setCurrentMode(newMode);
    window.sfMetadataContext.localStorage.setItem('gallery-group-by', newMode);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_GALLERY_GROUP_BY, newMode);
  }, []);

  return (
    <div className="metadata-gallery-group-by-setter">
      {Object.entries(DATE_MODE_MAP).map(([dateMode, label]) => (
        <button
          key={dateMode}
          className={classnames('metadata-gallery-group-by-button', { active: currentMode === dateMode })}
          onClick={() => handleGroupByChange(dateMode)}
        >
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

GalleryGroupBySetter.propTypes = {
  view: PropTypes.shape({
    _id: PropTypes.string
  })
};

export default GalleryGroupBySetter;
