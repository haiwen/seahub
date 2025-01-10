import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { EVENT_BUS_TYPE, GALLERY_DATE_MODE, STORAGE_GALLERY_DATE_MODE_KEY } from '../../constants';
import { gettext } from '../../../utils/constants';
import RadioGroup from '../radio-group';

const DATE_MODES = [
  { value: GALLERY_DATE_MODE.YEAR, label: gettext('Year') },
  { value: GALLERY_DATE_MODE.MONTH, label: gettext('Month') },
  { value: GALLERY_DATE_MODE.DAY, label: gettext('Day') },
  { value: GALLERY_DATE_MODE.ALL, label: gettext('All') },
];

const GalleryGroupBySetter = ({ view }) => {
  const [currentMode, setCurrentMode] = useState(GALLERY_DATE_MODE.DAY);

  useEffect(() => {
    const savedValue = window.sfMetadataContext.localStorage.getItem(STORAGE_GALLERY_DATE_MODE_KEY) || GALLERY_DATE_MODE.DAY;
    setCurrentMode(savedValue);
  }, [view?._id]);

  const handleGroupByChange = useCallback((newMode) => {
    if (currentMode === newMode) return;
    setCurrentMode(newMode);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_GALLERY_GROUP_BY, newMode);
  }, [currentMode]);

  return (<RadioGroup value={currentMode} options={DATE_MODES} onChange={handleGroupByChange} />);
};

GalleryGroupBySetter.propTypes = {
  view: PropTypes.shape({
    _id: PropTypes.string
  })
};

export default GalleryGroupBySetter;
