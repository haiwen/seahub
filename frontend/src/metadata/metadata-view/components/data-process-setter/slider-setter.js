import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, Input } from 'reactstrap';
import { EVENT_BUS_TYPE } from '../../constants';
import Icon from '../../../../components/icon';

import './slider-setter.css';

const SliderSetter = ({ view }) => {
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
    const adjust = Math.min(sliderValue + 1, 2);
    setSliderValue(adjust);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_GALLERY_ZOOM_GEAR, adjust);
  }, [sliderValue]);

  const handleImageShrink = useCallback(() => {
    const adjust = Math.max(sliderValue - 1, -2);
    setSliderValue(adjust);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_GALLERY_ZOOM_GEAR, adjust);
  }, [sliderValue]);

  return (
    <div className='metadata-slider-container'>
      <Button className="metadata-slider-icon-button" onClick={handleImageShrink}>
        <Icon symbol='minus_sign' className='metadata-slider-icon' />
      </Button>
      <Input
        type="range"
        min="-2"
        max="2"
        step="1"
        value={sliderValue}
        onChange={handleGalleryColumnsChange}
        className="metadata-slider"
      />
      <Button className="metadata-slider-icon-button" onClick={handleImageExpand} >
        <Icon symbol='plus_sign' className='metadata-slider-icon' />
      </Button>
    </div>
  );
};

SliderSetter.propTypes = {
  view: PropTypes.object,
};

export default SliderSetter;
