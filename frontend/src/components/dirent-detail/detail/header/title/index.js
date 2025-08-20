import React from 'react';
import PropTypes from 'prop-types';

import './index.css';

const Title = ({ icon, iconSize, title }) => {

  return (
    <div className="detail-title dirent-title">
      {icon && (
        <div className="detail-header-icon-container">
          <img src={icon} width={iconSize} height={iconSize} alt="" />
        </div>
      )}
      <span className="name ellipsis" title={title}>{title}</span>
    </div>
  );
};

Title.propTypes = {
  icon: PropTypes.string,
  iconSize: PropTypes.number,
  title: PropTypes.string,
};

export default Title;
