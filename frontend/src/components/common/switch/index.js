import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import '../../../css/switch.css';

function Switch(props) {
  const { onChange, checked, placeholder, disabled, className, size, textPosition } = props;
  return(
    <div className={classnames('seahub-switch position-relative', className, size)}>
      <label className="custom-switch">
        <input
          className="custom-switch-input"
          type="checkbox"
          checked={checked}
          onChange={onChange}
          name="custom-switch-checkbox"
          disabled={disabled}
        />
        {textPosition === 'left' &&
          <span className="custom-switch-description text-truncate">{placeholder}</span>
        }
        <span className={classnames('custom-switch-indicator', {'disabled': disabled})}></span>
        {textPosition === 'right' &&
          <span className="custom-switch-description text-truncate">{placeholder}</span>
        }
      </label>
    </div>
  );
}

Switch.propTypes = {
  checked: PropTypes.bool,
  disabled: PropTypes.bool,
  placeholder: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  className: PropTypes.string,
  size: PropTypes.oneOf(['large', 'small', undefined]),
  textPosition: PropTypes.oneOf(['left', 'right', undefined]),
  onChange: PropTypes.func,
};

Switch.defaultProps = {
  textPosition: 'left',
};

export default Switch;
