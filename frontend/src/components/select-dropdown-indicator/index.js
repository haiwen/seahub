import React from 'react';
import Icon from '../icon';

import './index.css';

const SelectDropdownIndicator = () => {
  return (
    <span className="select-dropdown-indicator d-flex align-items-center" aria-hidden="true">
      <Icon symbol="down" />
    </span>
  );
};

export default SelectDropdownIndicator;
