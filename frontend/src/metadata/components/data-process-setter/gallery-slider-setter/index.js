import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, Input } from 'reactstrap';
import Icon from '../../../../components/icon';
import { gettext } from '../../../../utils/constants';
import { EVENT_BUS_TYPE, GALLERY_ZOOM_GEAR_MIN, GALLERY_ZOOM_GEAR_MAX, STORAGE_GALLERY_ZOOM_GEAR_KEY } from '../../../constants';
import { Utils } from '../../../../utils/utils';

import './index.css';

const GallerySliderSetter = ({ viewID }) => {
  const [sliderValue, setSliderValue] = useState(() => {
    const savedValue = window.sfMetadataContext.localStorage.getItem(STORAGE_GALLERY_ZOOM_GEAR_KEY, 0);
    return savedValue || 0;
  });

  useEffect(() => {
    const savedValue = window.sfMetadataContext.localStorage.getItem(STORAGE_GALLERY_ZOOM_GEAR_KEY, 0);
    setSliderValue(savedValue || 0);
  }, [viewID]);

  const handleGalleryColumnsChange = useCallback((e) => {
    const adjust = parseInt(e.target.value, 10);
    setSliderValue(adjust);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_GALLERY_ZOOM_GEAR, adjust);
  }, []);

  const handleImageExpand = useCallback(() => {
    if (sliderValue >= GALLERY_ZOOM_GEAR_MAX) return;

    const adjust = Math.min(sliderValue + 1, GALLERY_ZOOM_GEAR_MAX);
    setSliderValue(adjust);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_GALLERY_ZOOM_GEAR, adjust);
  }, [sliderValue]);

  const handleImageShrink = useCallback(() => {
    if (sliderValue <= GALLERY_ZOOM_GEAR_MIN) return;

    const adjust = Math.max(sliderValue - 1, GALLERY_ZOOM_GEAR_MIN);
    setSliderValue(adjust);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_GALLERY_ZOOM_GEAR, adjust);
  }, [sliderValue]);

  return (
    <div className='metadata-slider-container'>
      <Button
        className="metadata-slider-icon-button"
        onClick={handleImageShrink}
        disabled={sliderValue <= GALLERY_ZOOM_GEAR_MIN}
        aria-label={gettext('Zoom out')}
        title={gettext('Zoom out')}
        onKeyDown={Utils.onKeyDown}
      >
        <Icon symbol='minus_sign' className='metadata-slider-icon' />
      </Button>
      <Input
        type="range"
        tabIndex={-1}
        aria-hidden="true"
        min={GALLERY_ZOOM_GEAR_MIN}
        max={GALLERY_ZOOM_GEAR_MAX}
        step="1"
        value={sliderValue}
        onChange={handleGalleryColumnsChange}
        className="metadata-slider"
      />
      <Button
        className="metadata-slider-icon-button"
        onClick={handleImageExpand}
        disabled={sliderValue >= GALLERY_ZOOM_GEAR_MAX}
        aria-label={gettext('Zoom in')}
        title={gettext('Zoom in')}
        onKeyDown={Utils.onKeyDown}
      >
        <Icon symbol='plus_sign' className='metadata-slider-icon' />
      </Button>
    </div>
  );
};

GallerySliderSetter.propTypes = {
  viewID: PropTypes.string,
};

export default GallerySliderSetter;
