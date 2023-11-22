import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';

import './ai-search-refrences.css';

function AISearchRefrences({hitFiles, onItemClickHandler}) {
  return (
    <div className="ai-search-refrences">
      <div className="ai-search-refrences-title">{gettext('Reference documents')}{':'}</div>
      <div className='ai-search-refrences-container'>
        {hitFiles.map((hitFile, index) => {
          return (
            <div
              className="ai-search-refrences-detail text-truncate"
              onClick={() => onItemClickHandler(hitFile)}
              key={index}
            >
              {`${index + 1}. ${hitFile.name}`}
            </div>
          );
        })}
      </div>
    </div>
  );
}

AISearchRefrences.propTypes = {
  hitFiles: PropTypes.array.isRequired,
  onItemClickHandler: PropTypes.func.isRequired,
};

export default AISearchRefrences;
