import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';
import OpIcon from './op-icon';

function BackIcon({ onClick }) {
  return (
    <OpIcon
      className="sf3-font sf3-font-arrow rotate-180 op-icon op-icon-bg-light mr-1"
      title={gettext('Back')}
      op={onClick}
    />
  );
}

BackIcon.propTypes = {
  onClick: PropTypes.func
};

export default BackIcon;
