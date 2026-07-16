import React from 'react';
import { gettext, mediaUrl } from '../../../utils/constants';

import './index.css';

const Tip = ({ isSearchEnabled, hasAvailableOptions, searchValue, tip }) => {
  if (!hasAvailableOptions || !isSearchEnabled) {
    return (
      <div className="option-editor-no-results-tip option-editor-empty-tip">
        <img src={`${mediaUrl}img/no-results.png`} alt="" width="100" height="100" className="option-editor-empty-tip-img" />
        {tip}
      </div>
    );
  }

  if (searchValue) {
    return (
      <div className="option-editor-no-results-tip option-editor-empty-tip">
        <img src={`${mediaUrl}img/no-results.png`} alt="" width="100" height="100" className="option-editor-empty-tip-img" />
        {gettext('No results')}
      </div>
    );
  }

  return (
    <div className="option-editor-start-searching-tip option-editor-empty-tip">
      <img src={`${mediaUrl}img/start-searching.png`} alt="" width="100" height="100" className="option-editor-empty-tip-img" />
      {gettext('Enter characters to start searching')}
    </div>
  );
};

export default Tip;
