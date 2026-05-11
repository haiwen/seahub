import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';
import Icon from './icon';
import Tooltip from './tooltip';

function BackIcon({ onClick }) {
  return (
    <span
      id="back-icon"
      role="button"
      className="op-icon op-icon-bg-light mr-1 rotate-180"
      aria-label={gettext('Back')}
      onClick={onClick}
    >
      <Icon symbol="arrow" />
      <Tooltip target="back-icon">{gettext('Back')}</Tooltip>
    </span>
  );
}

BackIcon.propTypes = {
  onClick: PropTypes.func
};

export default BackIcon;
