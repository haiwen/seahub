import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './index.css';

function Loading({ className }) {
  return (
    <span className={classnames('loading-icon loading-tip', className)}></span>
  );
}

Loading.propTypes = {
  className: PropTypes.string,
};

export default Loading;
