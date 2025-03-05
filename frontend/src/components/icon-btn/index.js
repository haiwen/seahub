import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Icon from '../icon';

import './index.css';

const IconBtn = ({ size = 20, className, iconClassName, CustomIcon, symbol, iconStyle, onClick, ...params }) => {
  return (
    <div className={classnames('seafile-multicolor-icon-btn', `seafile-multicolor-icon-btn-${size}`, className)} onClick={onClick ? onClick : () => {}} { ...params }>
      {CustomIcon ? CustomIcon : <Icon symbol={symbol} className={iconClassName} style={iconStyle} />}
    </div>
  );
};

IconBtn.propTypes = {
  customIcon: PropTypes.string,
  symbol: PropTypes.string,
  size: PropTypes.number,
  className: PropTypes.string,
  iconClassName: PropTypes.string,
  iconStyle: PropTypes.object,
  onClick: PropTypes.func,
};

export default IconBtn;
