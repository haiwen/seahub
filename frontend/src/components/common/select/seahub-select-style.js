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
  menuPortal: base => ({ ...base, zIndex: 9999 }),
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
  // multi select style
  multiValue: (provided) => {
    return {
      ...provided,
      display: 'inline-flex',
      alignItems: 'center',
      background: '#eaeaea',
      borderRadius: '10px',
      margin: '0 10px 0 0',
      padding: '0 0 0 2px',
    };
  },
  multiValueLabel: (provided) => {
    return {
      ...provided,
      padding: '0px',
    };
  },
  multiValueRemove: (provided) => {
    return {
      ...provided,
      color: '#666',
      ':hover': {
        backgroundColor: 'transparent',
        color: '#666666',
      }
    };
  },
  // single select style
  singleValue: (provided) => {
    return {
      ...provided,
      display: 'inline-flex',
      alignItems: 'center',
      background: '#eaeaea',
      borderRadius: '10px',
      margin: '0',
      padding: '0 2px',
      width: 'fit-content',
    };
  },
};

const NoOptionsStyle = {
  margin: '6px 10px',
  textAlign: 'center',
  color: 'hsl(0, 0%, 50%)',
};

export { MenuSelectStyle, UserSelectStyle, NoOptionsStyle };
