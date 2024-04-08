const MenuSelectStyle = {
  option: (provided, state) => {
    const { isDisabled, isSelected, isFocused } = state;
    return ({
      ...provided,
      cursor: isDisabled ? 'default' : 'pointer',
      backgroundColor: isSelected ? '#20a0ff' : (isFocused ? '#f5f5f5' : '#fff'),
      '.header-icon .dtable-font': {
        color: isSelected ? '#fff' : '#aaa',
      },
    });
  },
  control: (provided) => ({
    ...provided,
    fontSize: '14px',
    cursor: 'pointer',
    lineHeight: '1.5',
  }),
  menuPortal:  base => ({ ...base, zIndex: 9999 }),
  indicatorSeparator: () => {},
};

const UserSelectStyle = {
  option: (provided, state) => {
    const { isDisabled, isFocused } = state;
    return ({
      ...provided,
      cursor: isDisabled ? 'default' : 'pointer',
      backgroundColor: isFocused ? '#f5f5f5' : '#fff',
    });
  },
  control: (provided) => ({
    ...provided,
    fontSize: '14px',
    cursor: 'pointer',
    lineHeight: '1.5',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: () => ({
    display: 'none',
  }),
  clearIndicator: () => ({
    display: 'none',
  }),
};

export { MenuSelectStyle, UserSelectStyle };
