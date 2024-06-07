import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../../../components/icon';
import classNames from 'classnames';
import './nav-item-icon.css';

function NavItemIcon({ symbol, className, disable, onClick }) {
  return (
    <div onClick={onClick} className={classNames('nav-item-icon', {'nav-item-icon-disable': disable})}>
      <Icon symbol={symbol} className={className} />
    </div>
  );
}

NavItemIcon.propTypes = {
  symbol: PropTypes.string.isRequired,
  className: PropTypes.string,
  disable: PropTypes.bool,
  onClick: PropTypes.func,
};

export default NavItemIcon;
