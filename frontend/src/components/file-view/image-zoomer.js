import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Input, Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import IconButton from '../../components/icon-button';
import Icon from '../../components/icon';
import { gettext } from '../../utils/constants';

const SCALE_OPTIONS = [0.15, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const SCALE_MIN = SCALE_OPTIONS[0];
const SCALE_MAX = SCALE_OPTIONS[SCALE_OPTIONS.length - 1];
const SCALE_OPTIONS_2 = [
  { value: 'page-fit', text: gettext('Page fit') },
  { value: 'actual-size', text: gettext('Actual size') }
];
const DEFAULT_SCALE = SCALE_OPTIONS_2[0];

const ImageZoomer = ({ setImageScale, setDefaultPageFitScale }) => {

  const [curScale, setScale] = useState(1);
  const [curScaleText, setScaleText] = useState(DEFAULT_SCALE.text); // for the text shown in the input
  const [selectedScale, setSelectedScale] = useState(DEFAULT_SCALE.value); // for the scale menu
  const [isScaleMenuOpen, setScaleMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setScaleMenuOpen(!isScaleMenuOpen);
  }, [isScaleMenuOpen, setScaleMenuOpen]);

  const scaleImage = useCallback((scale) => {
    setImageScale(scale);
  }, [setImageScale]);

  const zoomInOrOut = useCallback((scale) => {
    setScale(scale);
    scaleImage(scale);
    setScaleText(`${Math.round(scale * 100)}%`); // handle the result of floating point arithmetic
    if (SCALE_OPTIONS.indexOf(scale) == -1) {
      setSelectedScale(null);
    } else {
      setSelectedScale(scale);
    }
  }, [scaleImage]);

  const zoomIn = useCallback(() => {
    const offset = Math.ceil(curScale) * 0.1; // round up
    const normalizedScale = Number((curScale + offset).toFixed(2)); // handle the result of floating point arithmetic
    const scale = Math.min(normalizedScale, SCALE_MAX);
    zoomInOrOut(scale);
  }, [curScale, zoomInOrOut]);

  const zoomOut = useCallback(() => {
    const offset = Math.ceil(curScale) * 0.1; // round up
    const normalizedScale = Number((curScale - offset).toFixed(2)); // handle the result of floating point arithmetic
    const scale = Math.max(normalizedScale, SCALE_MIN);
    zoomInOrOut(scale);
  }, [curScale, zoomInOrOut]);

  const scaleImageToPageFit = useCallback(() => {
    const imageElement = document.getElementById('image-view');
    // make sure real dom is rendered before calculating the scale
    if (!imageElement || (imageElement.clientWidth === 2 && imageElement.clientHeight === 2)) {
      setTimeout(() => {
        scaleImageToPageFit();
      }, 1);
      return;
    }
    const borderWidth = 1;
    const width = imageElement.clientWidth + borderWidth * 2;
    const height = imageElement.clientHeight + borderWidth * 2;

    const imageContainer = imageElement.parentNode;
    const hPadding = 0; // horizontal padding
    const vPadding = 30; // vertical padding
    const maxWidth = imageContainer.clientWidth - hPadding * 2;
    const maxHeight = imageContainer.clientHeight - vPadding * 2;

    const hScale = maxWidth / width;
    const vScale = maxHeight / height;
    const scale = Math.min(hScale, vScale);
    setScale(scale);
    scaleImage(scale);
    setDefaultPageFitScale(scale);
  }, [setScale, scaleImage, setDefaultPageFitScale]);

  const onMenuItemClick = useCallback((value) => {
    setSelectedScale(value);
    if (SCALE_OPTIONS.indexOf(value) != -1) {
      const scale = value;
      setScale(scale);
      scaleImage(scale);
      setScaleText(`${scale * 100}%`);
    } else {
      if (value == 'actual-size') {
        const scale = 1;
        setScale(scale);
        scaleImage(scale);
      } else {
        // 'page-fit'
        scaleImageToPageFit();
      }
      setScaleText(SCALE_OPTIONS_2.filter(item => item.value == value)[0].text);
    }
    setScaleMenuOpen(false);
  }, [scaleImage, setScaleMenuOpen, scaleImageToPageFit]);

  const onMenuItemKeyDown = useCallback((e, value) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      onMenuItemClick(value);
    }
  }, [onMenuItemClick]);

  useEffect(() => {
    scaleImageToPageFit();
  }, [scaleImageToPageFit]);

  return (
    <div className='d-flex align-items-center image-zoomer'>
      <IconButton
        id="zoom-out-image"
        icon="minus-sign"
        text={gettext('Zoom out')}
        onClick={zoomOut}
        disabled={curScale == SCALE_MIN}
      />
      <Dropdown
        isOpen={isScaleMenuOpen}
        toggle={toggleMenu}
        className="vam"
        direction='down'
      >
        <DropdownToggle
          tag='div'
          role='button'
          tabIndex="0"
          className="position-relative d-flex align-items-center"
          data-toggle="dropdown"
          aria-expanded={isScaleMenuOpen}
        >
          <Input id="cur-scale-input" type="text" value={curScaleText} readOnly={true} tabIndex="-1" />
          <Icon id="scale-menu-caret" symbol="down" />
        </DropdownToggle>
        <DropdownMenu id="scale-menu">
          {SCALE_OPTIONS.map((item, index) => {
            return (
              <DropdownItem
                key={index}
                className="position-relative pl-5"
                onClick={() => {onMenuItemClick(item);}}
                onKeyDown={(e) => {onMenuItemKeyDown(e, item);}}
              >
                {selectedScale == item && (
                  <span className="dropdown-item-tick">
                    <Icon symbol="check-thin" />
                  </span>
                )}
                <span>{`${item * 100}%`}</span>
              </DropdownItem>
            );
          })}
          {SCALE_OPTIONS_2.map((item, index) => {
            return (
              <DropdownItem
                key={index}
                className="position-relative pl-5"
                onClick={() => {onMenuItemClick(item.value);}}
                onKeyDown={(e) => {onMenuItemKeyDown(e, item.value);}}
              >
                {selectedScale == item.value && (
                  <span className="dropdown-item-tick">
                    <Icon symbol="check-thin" />
                  </span>
                )}
                <span>{item.text}</span>
              </DropdownItem>
            );
          })}
        </DropdownMenu>
      </Dropdown>
      <IconButton
        id="zoom-in-image"
        icon="plus-sign"
        text={gettext('Zoom in')}
        onClick={zoomIn}
        disabled={curScale == SCALE_MAX}
      />
    </div>
  );
};

ImageZoomer.propTypes = {
  setImageScale: PropTypes.func
};

export default ImageZoomer;
