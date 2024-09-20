import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, Input } from 'reactstrap';
import Icon from '../../../../components/icon';
import { EVENT_BUS_TYPE, GALLERY_ZOOM_GEAR_MIN, GALLERY_ZOOM_GEAR_MAX } from '../../../constants';

import './index.css';

const GallerySliderSetter = ({ view }) => {
  const [sliderValue, setSliderValue] = useState(() => {
    const savedValue = window.sfMetadataContext.localStorage.getItem('zoom-gear', 0);
    return savedValue || 0;
  });

  useEffect(() => {
    const savedValue = window.sfMetadataContext.localStorage.getItem('zoom-gear', 0);
    setSliderValue(savedValue || 0);
  }, [view?._id]);

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
      <Button className="metadata-slider-icon-button" onClick={handleImageShrink} disabled={sliderValue <= GALLERY_ZOOM_GEAR_MIN}>
        <Icon symbol='minus_sign' className='metadata-slider-icon' />
      </Button>
      <Input
        type="range"
        min={GALLERY_ZOOM_GEAR_MIN}
        max={GALLERY_ZOOM_GEAR_MAX}
        step="1"
        value={sliderValue}
        onChange={handleGalleryColumnsChange}
        className="metadata-slider"
      />
      <Button className="metadata-slider-icon-button" onClick={handleImageExpand} disabled={sliderValue >= GALLERY_ZOOM_GEAR_MAX}>
        <Icon symbol='plus_sign' className='metadata-slider-icon' />
      </Button>
    </div>
  );
};

GallerySliderSetter.propTypes = {
  view: PropTypes.object,
};

export default GallerySliderSetter;
