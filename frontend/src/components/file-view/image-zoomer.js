import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button, Input } from 'reactstrap';
import Icon from '../../components/icon';

import '../../metadata/components/data-process-setter/gallery-slider-setter/index.css';

const SCALE_OPTIONS = [0.25, 0.5, 1, 1.5, 2];
const SCALE_MIN = SCALE_OPTIONS[0];
const SCALE_MAX = SCALE_OPTIONS[SCALE_OPTIONS.length - 1];

const ImageZoomer = ({ setImageScale }) => {

  const [curScale, setScale] = useState(1);

  const scaleImage = useCallback((scale) => {
    setImageScale(scale);
  }, [setImageScale]);

  const changeScale = useCallback((e) => {
    const scale = Number(e.target.value);
    setScale(scale);
    scaleImage(scale);
  }, [scaleImage]);

  const zoomIn = useCallback(() => {
    const scale = SCALE_OPTIONS[SCALE_OPTIONS.indexOf(curScale) + 1];
    setScale(scale);
    scaleImage(scale);
  }, [curScale, scaleImage]);

  const zoomOut = useCallback(() => {
    const scale = SCALE_OPTIONS[SCALE_OPTIONS.indexOf(curScale) - 1];
    setScale(scale);
    scaleImage(scale);
  }, [curScale, scaleImage]);

  return (
    <div className='metadata-slider-container image-zoomer ml-0'>
      <Button className="metadata-slider-icon-button" onClick={zoomOut} disabled={curScale == SCALE_MIN}>
        <Icon symbol='minus_sign' className='metadata-slider-icon' />
      </Button>
      <Input
        type="range"
        min={SCALE_MIN}
        max={SCALE_MAX}
        step="any"
        value={curScale}
        onChange={changeScale}
        className="metadata-slider"
      />
      <Button className="metadata-slider-icon-button" onClick={zoomIn} disabled={curScale == SCALE_MAX}>
        <Icon symbol='plus_sign' className='metadata-slider-icon' />
      </Button>
    </div>
  );
};

ImageZoomer.propTypes = {
  setImageScale: PropTypes.func
};

export default ImageZoomer;
