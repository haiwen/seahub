import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';
import Icon from './icon';

function BackIcon({ onClick }) {
  return (
    <span
      role="button"
      className="op-icon op-icon-bg-light mr-1 rotate-180"
      title={gettext('Back')}
      aria-label={gettext('Back')}
      onClick={onClick}
    >
      <Icon symbol="arrow" />
    </span>
  );
}

BackIcon.propTypes = {
  onClick: PropTypes.func
};

export default BackIcon;
