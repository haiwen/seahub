import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';
import OpIcon from './op-icon';

function BackIcon({ onClick }) {
  return (
    <OpIcon
      id="back-icon"
      className="op-icon op-icon-bg-light mr-1 rotate-180"
      symbol="arrow"
      tooltip={gettext('Back')}
      op={onClick}
    />
  );
}

BackIcon.propTypes = {
  onClick: PropTypes.func
};

export default BackIcon;
