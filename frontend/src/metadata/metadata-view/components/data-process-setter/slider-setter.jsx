import React, { useState, useCallback, useEffect } from 'react';
import { Button, Input } from 'reactstrap';
import { EVENT_BUS_TYPE } from '../../constants';
import './slider-setter.css';

const SliderSetter = () => {
  const [sliderValue, setSliderValue] = useState(() => {
    const savedValue = localStorage.getItem('sliderValue');
    return savedValue !== null ? parseInt(savedValue, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem('sliderValue', sliderValue);
  }, [sliderValue]);

  const handleGalleryColumnsChange = useCallback((e) => {
    const adjust = parseInt(e.target.value, 10);
    setSliderValue(adjust);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_GALLERY_COLUMNS, adjust);
  }, []);

  const handleImageExpand = useCallback(() => {
    const adjust = Math.min(sliderValue + 1, 2);
    setSliderValue(adjust);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_GALLERY_COLUMNS, adjust);
  }, [sliderValue]);

  const handleImageShrink = useCallback(() => {
    const adjust = Math.max(sliderValue - 1, -2);
    setSliderValue(adjust);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_GALLERY_COLUMNS, adjust);
  }, [sliderValue]);

  return (
    <div className='custom-slider-container'>
      <Button className="slider-icon-button" onClick={handleImageShrink}>
        <span className='slider-icon-button-text'>-</span>
      </Button>
      <Input
        type="range"
        min="-2"
        max="2"
        step="1"
        value={sliderValue}
        onChange={handleGalleryColumnsChange}
        className="custom-slider"
      />
      <Button className="slider-icon-button" onClick={handleImageExpand} >
        <span className='slider-icon-button-text'>+</span>
      </Button>
    </div>
  );
};

export default SliderSetter;
