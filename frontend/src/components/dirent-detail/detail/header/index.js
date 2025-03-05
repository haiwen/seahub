import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../../../icon';
import Title from './title';

import './index.css';

const Header = ({ title, icon, iconSize = 32, onClose, children, component = {} }) => {
  const { closeIcon } = component;
  return (
    <div className="detail-header">
      <Title title={title} icon={icon} iconSize={iconSize} />
      {(children || onClose) && (
        <div className="detail-control-container">
          {children}
          {onClose && (
            <div className="detail-control" onClick={onClose}>
              {closeIcon ? closeIcon : <Icon symbol="close" className="detail-control-close" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

Header.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  iconSize: PropTypes.number,
  component: PropTypes.object,
  children: PropTypes.any,
  onClose: PropTypes.func,
};

export default Header;
