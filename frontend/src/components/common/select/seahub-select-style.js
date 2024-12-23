// Seahub select is based on seafile-ui.css, so use the following content to override the default react-select style
const DEFAULT_CONTROL_STYLE = {
  border: '1px solid rgba(0, 40, 100, 0.12) !important',
};

const FOCUS_CONTROL_STYLE = {
  fontSize: '14px',
  backgroundColor: '#ffffff',
  borderColor: '#1991eb',
  outline: '0',
  boxShadow: '0 0 0 2px rgba(70, 127, 207, 0.25)',
};

const noneCallback = () => ({
  display: 'none',
});

const controlCallback = (provided, state) => {
  const { isDisabled, isFocused } = state;
  if (isFocused && !isDisabled) {
    return {
      ...provided,
      ...FOCUS_CONTROL_STYLE,
      '&:hover': {
        ...provided,
        ...FOCUS_CONTROL_STYLE,
      }
    };
  }
  return {
    ...provided,
    fontSize: '14px',
    lineHeight: '1.5',
    cursor: 'pointer',
    ...DEFAULT_CONTROL_STYLE,
    '&:hover': {
      ...DEFAULT_CONTROL_STYLE,
    }
  };
};

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
  control: controlCallback,
  menuPortal: base => ({ ...base, zIndex: 9999 }),
  indicatorSeparator: noneCallback,
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
  control: controlCallback,
  indicatorSeparator: noneCallback,
  dropdownIndicator: noneCallback,
  clearIndicator: noneCallback,
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
