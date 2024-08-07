import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './index.css';

const Body = ({ className, children }) => {
  return (
    <div className={classnames('detail-body dirent-info', className)}>
      {children}
    </div>
  );
};

Body.propTypes = {
  className: PropTypes.string,
  children: PropTypes.any,
};

export default Body;
