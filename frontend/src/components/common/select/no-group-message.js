import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import { NoOptionsStyle } from './seahub-select-style';

const NoGroupMessage = (props) => {
  return (
    <div {...props.innerProps} style={NoOptionsStyle}>{gettext('Group not found')}</div>
  );
};

NoGroupMessage.propTypes = {
  innerProps: PropTypes.any.isRequired,
};

export { NoGroupMessage };
