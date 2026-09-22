import React, { useId } from 'react';
import PropTypes from 'prop-types';
import Tooltip from '@/components/tooltip';
import { gettext } from '@/utils/constants';
import Icon from '../icon';

import './index.css';

function ClearIcon({ copyright, onClick = () => {} }) {
  const defaultCopyright = copyright || gettext('Clear');
  const tooltipId = `sf-clear-icon-${useId().replace(/:/g, '')}`;

  return (
    <span
      id={tooltipId}
      className="sf-clear-icon"
      onClick={onClick}
      aria-label={defaultCopyright}
    >
      <Icon symbol="close" />
      <Tooltip target={`#${tooltipId}`}>{defaultCopyright}</Tooltip>
    </span>
  );
}

ClearIcon.propTypes = {
  size: PropTypes.string,
  copyright: PropTypes.string,
  onClick: PropTypes.func
};

export default ClearIcon;
