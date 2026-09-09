import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';

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
