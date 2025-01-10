import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../../../icon';
import Title from './title';

import './index.css';

<<<<<<< HEAD
const Header = ({ title, icon, iconSize = 32, onClose, children, component = {} }) => {
  const { isShowControl, closeIcon } = component;
  return (
    <div className="detail-header">
      <Title title={title} icon={icon} iconSize={iconSize} />
      {isShowControl && (
=======
const Header = ({ title, icon, iconSize = 32, onClose, children, component = {}, withinPreviewer }) => {
  const { closeIcon } = component;
  return (
    <div className="detail-header">
      <Title title={title} icon={icon} iconSize={iconSize} />
      {!withinPreviewer && (
>>>>>>> 45ce3539d (show people in sidepanel)
        <div className="detail-control-container">
          {children}
          <div className="detail-control" onClick={onClose}>
            {closeIcon ? closeIcon : <Icon symbol="close" className="detail-control-close" />}
          </div>
        </div>
      )}
    </div>
  );
};

Header.defaultProps = {
  component: {
    isShowControl: true,
  }
};

Header.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  iconSize: PropTypes.number,
  component: PropTypes.object,
  children: PropTypes.any,
  onClose: PropTypes.func.isRequired,
<<<<<<< HEAD
  isShowControl: PropTypes.bool,
=======
  withinPreviewer: PropTypes.bool,
>>>>>>> 45ce3539d (show people in sidepanel)
};

export default Header;
