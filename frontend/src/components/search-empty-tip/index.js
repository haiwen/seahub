import React from 'react';
import PropTypes from 'prop-types';
import { mediaUrl } from '@/utils/constants';
import './index.css';

const IMAGE_TYPE = {
  NO_RESULTS: 'no-results',
  START_SEARCHING: 'start-searching',
};

const IMAGE_SRC = {
  [IMAGE_TYPE.NO_RESULTS]: {
    light: 'no-results.png',
    dark: 'no-results-dark.png',
  },
  [IMAGE_TYPE.START_SEARCHING]: {
    light: 'start-searching.png',
    dark: 'start-searching-dark.png',
  },
};

const SearchEmptyTip = ({ text, showImage = true, imageType = IMAGE_TYPE.NO_RESULTS }) => {
  const imageSrc = IMAGE_SRC[imageType] || IMAGE_SRC[IMAGE_TYPE.NO_RESULTS];
  return (
    <div className={`search-empty-tip ${showImage ? '' : 'search-empty-tip-text-only'}`}>
      {showImage &&
        <>
          <img
            src={`${mediaUrl}img/${imageSrc.light}`}
            alt=""
            className="search-empty-tip-img search-empty-tip-img-light"
          />
          <img
            src={`${mediaUrl}img/${imageSrc.dark}`}
            alt=""
            className="search-empty-tip-img search-empty-tip-img-dark"
          />
        </>
      }
      {text && <span className="search-empty-tip-text">{text}</span>}
    </div>
  );
};

SearchEmptyTip.propTypes = {
  text: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  showImage: PropTypes.bool,
  imageType: PropTypes.oneOf(Object.values(IMAGE_TYPE)),
};

export default SearchEmptyTip;
