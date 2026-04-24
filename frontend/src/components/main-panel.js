import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  children: PropTypes.any.isRequired,
};

const MainPanel = ({ children }) => {
  return (
    <div className="main-panel">
      {children}
    </div>
  );
};

MainPanel.propTypes = propTypes;

export default MainPanel;
