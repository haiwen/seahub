import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import FileIcon from '../../../assets/icons/file.svg';
import FilesIcon from '../../../assets/icons/files.svg';

import '../css/nav-item-icon.css';

function NavItemIcon({ symbol, className, disable, onClick }) {
  return (
    <div
      onClick={onClick}
      className={classNames('nav-item-icon', { 'nav-item-icon-disable': disable })}
      role="button"
      aria-label={symbol}
    >
      {symbol === 'file' && <FileIcon className='seafile-multicolor-icon' aria-hidden="true" />}
      {symbol === 'files' && <FilesIcon className='seafile-multicolor-icon' aria-hidden="true" />}
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
