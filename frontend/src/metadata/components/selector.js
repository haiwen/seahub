import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { SeahubSelect } from '../../components/common/select';

const Selector = ({ options, settingKey, value, defaultValue, onChange }) => {

  const handleOnChange = useCallback((option) => {
    const newValue = option.value;
    if (newValue === value) return;
    onChange(settingKey, newValue);
  }, [settingKey, value, onChange]);

  let selectedOption = options.find(option => option.value === value);
  if (!selectedOption && defaultValue) {
    options.find(option => option.value === defaultValue);
  }

  return (
    <SeahubSelect
      classNamePrefix="sf-metadata-setting-selector"
      value={selectedOption}
      options={options}
      onChange={handleOnChange}
      isSearchable={false}
      isClearable={false}
      menuPortalTarget=".sf-metadata-view-setting-panel"
    />
  );
};

Selector.propTypes = {
  settingKey: PropTypes.string,
  value: PropTypes.string,
  options: PropTypes.array.isRequired,
  onChange: PropTypes.func,
};

export default Selector;
