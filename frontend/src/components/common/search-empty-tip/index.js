import React from 'react';
import PropTypes from 'prop-types';
import { mediaUrl } from '../../../utils/constants';
import './index.css';

const SearchEmptyTip = ({ text, showImage = true }) => {
  return (
    <div className={`search-empty-tip ${showImage ? '' : 'search-empty-tip-text-only'}`}>
      {showImage &&
        <>
          <img
            src={`${mediaUrl}img/no-results.png`}
            alt=""
            className="search-empty-tip-img search-empty-tip-img-light"
          />
          <img
            src={`${mediaUrl}img/no-results-dark.png`}
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
};

export default SearchEmptyTip;
