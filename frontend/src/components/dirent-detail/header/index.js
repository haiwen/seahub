import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../../icon';

import './index.css';

const Header = ({ title, icon, onClose }) => {

  return (
    <div className="detail-header">
      <div className="detail-title dirent-title">
        <img src={icon} width="32" height="32" alt="" />
        <span className="name ellipsis" title={title}>{title}</span>
      </div>
      <div className="detail-control" onClick={onClose}>
        <Icon symbol="close" className="detail-control-close" />
      </div>
    </div>
  );
};

Header.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default Header;
