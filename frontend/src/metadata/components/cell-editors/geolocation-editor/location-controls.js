import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';
import Icon from '../../../../components/icon';
import IconBtn from '../../../../components/icon-btn';

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
        <IconBtn
          className="full-screen"
          symbol="full-screen"
          size={24}
          onClick={onFullScreen}
        />
        {position && (
          <span
            className="cur-view-path-btn sf3-font sf3-font-delete1"
            aria-label={gettext('Delete location')}
            title={gettext('Delete location')}
            onClick={onClear}
          />
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
