import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { EVENT_BUS_TYPE, GALLERY_DATE_MODE, STORAGE_GALLERY_DATE_MODE_KEY } from '../../constants';
import { gettext } from '../../../utils/constants';
import RadioGroup from '../radio-group';
import GallerySliderSetter from './gallery-slider-setter';

const DATE_MODES = [
  { value: GALLERY_DATE_MODE.YEAR, label: gettext('Year') },
  { value: GALLERY_DATE_MODE.MONTH, label: gettext('Month') },
  { value: GALLERY_DATE_MODE.DAY, label: gettext('Day') },
  { value: GALLERY_DATE_MODE.ALL, label: gettext('All') },
];

const GalleryGroupBySetter = ({ viewID }) => {
  const [currentMode, setCurrentMode] = useState(GALLERY_DATE_MODE.YEAR);

  const handleGroupByChange = useCallback((newMode) => {
    if (newMode === currentMode) return;
    window.sfMetadataContext.localStorage.setItem(STORAGE_GALLERY_DATE_MODE_KEY, newMode);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_GALLERY_GROUP_BY, newMode);
  }, [currentMode]);

  useEffect(() => {
    const unsubscribeGalleryGroupBy = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.SWITCH_GALLERY_GROUP_BY, (newMode) => {
      if (newMode === currentMode) return;
      setCurrentMode(newMode);
    });

    return () => {
      unsubscribeGalleryGroupBy();
    };
  }, [currentMode]);

  useEffect(() => {
    const savedValue = window.sfMetadataContext.localStorage.getItem(STORAGE_GALLERY_DATE_MODE_KEY, GALLERY_DATE_MODE.DAY);
    setCurrentMode(savedValue || GALLERY_DATE_MODE.DAY);
  }, [viewID]);

  return (
    <>
      {currentMode === GALLERY_DATE_MODE.ALL && <GallerySliderSetter viewID={viewID} />}
      <RadioGroup value={currentMode} options={DATE_MODES} onChange={handleGroupByChange} />
    </>
  );
};

GalleryGroupBySetter.propTypes = {
  viewID: PropTypes.string,
};

export default GalleryGroupBySetter;
