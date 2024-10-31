import React from 'react';
import { gettext } from '../../utils/constants';
import './new-library.css';

export default function NewLibrary({ onClick }) {
  return (
    <div className="new-library-container" onClick={onClick}>
      <div className="new-library-star"></div>
      <div className="new-library-plus">
        <i className="sf2-icon-plus nav-icon" aria-hidden="true"></i>
      </div>
      <div className="new-library-text" aria-label={gettext('New Library')}>{gettext('New Library')}</div>
    </div>
  );
}
