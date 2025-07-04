import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import './index.css';

const RadioGroup = ({ value, options, className, onChange: onChangeAPI }) => {
  const selected = useMemo(() => {
    const selectedOption = options.find(o => value === o.value) || options[0];
    return selectedOption.value;
  }, [value, options]);

  const onChange = useCallback((event) => {
    const newValue = event.target.dataset.option;
    if (selected === newValue) return;
    onChangeAPI(newValue);
  }, [selected, onChangeAPI]);

  return (
    <div className={classnames('sf-metadata-radio-group', className)} data-active={value}>
      {options.map(option => {
        const { value, label } = option;
        return (
          <div
            key={value}
            data-option={value}
            className={classnames('sf-metadata-radio-group-option', { 'active': value === selected })}
            onClick={onChange}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
};

RadioGroup.propTypes = {
  value: PropTypes.string,
  options: PropTypes.array,
  className: PropTypes.string,
  onChange: PropTypes.func,
};

export default RadioGroup;
