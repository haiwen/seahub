import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../../../icon';

import './index.css';

const Header = ({ title, icon, iconSize = 32, onClose, component = {} }) => {
  const { closeIcon } = component;
  return (
    <div className="detail-header">
      <div className="detail-title dirent-title">
        <div className="detail-header-icon-container">
          <img src={icon} width={iconSize} height={iconSize} alt="" />
        </div>
        <span className="name ellipsis" title={title}>{title}</span>
      </div>
      <div className="detail-control" onClick={onClose}>
        {closeIcon ? closeIcon : (<Icon symbol="close" className="detail-control-close" />)}
      </div>
    </div>
  );
};

Header.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  iconSize: PropTypes.number,
  component: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default Header;
