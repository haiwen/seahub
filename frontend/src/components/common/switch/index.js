import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import '../../../css/switch.css';

function Switch(props) {
  const { onChange, checked, placeholder, disabled, className, size } = props;

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
        <span className="custom-switch-description text-truncate">{placeholder}</span>
        <span className="custom-switch-indicator"></span>
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
  onChange: PropTypes.func.isRequired,
};

export default Switch;
