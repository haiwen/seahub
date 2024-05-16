import React from 'react';
import PropTypes from 'prop-types';

const UserContent = ({ children }) => {
  return (
    <div className="cur-view-content">
      {children}
    </div>
  );
};

UserContent.propTypes = {
  children: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
};

export default UserContent;