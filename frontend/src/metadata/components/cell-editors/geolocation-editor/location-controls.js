import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';
import Icon from '../../../../components/icon';

const LocationControls = ({
  hasLocationChanged,
  inputValue,
  position,
  onFullScreen,
  onClear,
  onSave,
}) => {
  return (
    <div className="editor-header">
      <div className="title">
        <Icon symbol="location" size={24} className="location-icon" />
        <span className="ml-2">{gettext('Address')}</span>
      </div>
      <div className="header-actions">
        <span title={gettext('Full screen')} aria-label={gettext('Full screen')} onClick={onFullScreen}>
          <Icon symbol="fullscreen" className="cur-view-path-btn" />
        </span>
        {position && (
          <span
            className="cur-view-path-btn"
            aria-label={gettext('Delete location')}
            title={gettext('Delete location')}
            onClick={onClear}
          >
            <Icon symbol="delete1" />
          </span>
        )}
        <button
          className="btn btn-primary"
          onClick={onSave}
          disabled={!hasLocationChanged || !inputValue}
        >
          {gettext('Save')}
        </button>
      </div>
    </div>
  );
};

LocationControls.propTypes = {
  hasLocationChanged: PropTypes.bool.isRequired,
  inputValue: PropTypes.string.isRequired,
  position: PropTypes.object,
  onFullScreen: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default LocationControls;
