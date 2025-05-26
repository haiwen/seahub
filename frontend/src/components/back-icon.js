import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';


function BackIcon({ onClick }) {
  return (
    <i
      role="button"
      className="sf3-font sf3-font-arrow rotate-180 op-icon op-icon-bg-light mr-1"
      title={gettext('Back')}
      aria-label={gettext('Back')}
      onClick={onClick}
    >
    </i>
  );
}

BackIcon.propTypes = {
  onClick: PropTypes.func
};

export default BackIcon;
