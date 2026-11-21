import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import Icon from '../icon';

import './index.css';

const IconBtn = ({ size = 20, className, iconClassName, CustomIcon, symbol, iconStyle, onClick, ...params }) => {
  const { title, 'aria-label': ariaLabel, ...otherParams } = params;
  const accessibleName = ariaLabel || title;
  const icon = CustomIcon ? CustomIcon : <Icon symbol={symbol} className={iconClassName} style={iconStyle} />;
  const buttonClassName = classnames('seafile-multicolor-icon-btn', `seafile-multicolor-icon-btn-${size}`, className);

  if (onClick) {
    return (
      <button
        type="button"
        className={buttonClassName}
        onClick={onClick}
        title={title}
        aria-label={accessibleName}
        {...otherParams}
      >
        {icon}
      </button>
    );
  }

  return (
    <span className={buttonClassName} title={title} aria-label={accessibleName} {...otherParams}>
      {icon}
    </span>
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
