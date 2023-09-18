import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';

const NoGroupMessage = (props) => {
  return (
    <div {...props.innerProps} style={{margin: '6px 10px', textAlign: 'center', color: 'hsl(0,0%,50%)'}}>{gettext('Group not found')}</div>
  );
};

NoGroupMessage.propTypes = {
  innerProps: PropTypes.any.isRequired,
};

export { NoGroupMessage };
