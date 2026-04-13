// Seahub select is based on seafile-ui.css, so use the following content to override the default react-select style
const DEFAULT_CONTROL_STYLE = {
  fontSize: '14px',
  padding: '0 4px',
  border: '1px solid rgba(0, 40, 100, 0.12) !important',
  boxShadow: 'none',
  backgroundColor: 'var(--bs-popover-bg)',
  borderRadius: '4px',
  outline: '0',
};

const FOCUS_CONTROL_STYLE = {
  fontSize: '14px',
  padding: '0 4px',
  border: '1px solid #3e84f7',
  boxShadow: 'none',
  backgroundColor: 'var(--bs-popover-bg)',
  borderRadius: '4px',
  outline: '0',
};

const controlCallback = (provided, state) => {
  const { isDisabled, isFocused } = state;
  if (isDisabled) {
    return {
      ...provided,
      ...DEFAULT_CONTROL_STYLE,
      cursor: 'default',
      backgroundColor: '#f5f5f5',
      opacity: 0.65,
    };
  }
  if (isFocused) {
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
  // .react-select__menu / react-select-2-listbox
  menu: (base) => {
    return ({
      ...base,
      padding: '8px 0 8px 8px',
      backgroundColor: 'var(--bs-popover-bg)',
      border: '1px solid var(--bs-border-secondary-color)',
      borderRadius: '4px',
      boxShadow: '0px 6px 14px rgba(0, 0, 0, 0.1)',
    });
  },
  // .react-select__menu-list）
  menuList: (provided) => ({
    ...provided,
    paddingRight: '8px',
  }),
  option: (provided, state) => {
    const { isDisabled, isSelected, isFocused, isActive, isVisited } = state;
    let bgColor;
    if (isSelected) {
      bgColor = 'rgba(0, 0, 0, 0.04)';
    } else if (isActive || isVisited) {
      bgColor = 'rgba(0, 0, 0, 0.06)';
    } else if (isFocused) {
      bgColor = 'var(--bs-bg-color)';
    } else {
      bgColor = 'var(--bs-popover-bg)';
    }
    return ({
      ...provided,
      color: 'var(--bs-body-color)',
      borderRadius: '4px',
      height: '32px',
      padding: '6px 12px',
      cursor: isDisabled ? 'default' : 'pointer',
      backgroundColor: `${bgColor} !important`,
      '.header-icon .dtable-font': {
        color: '#aaa',
      },
      ...(isSelected && {
        paddingRight: '36px',
        position: 'relative',
        '&::after': {
          content: '"✓"',
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '14px',
          color: '#666',
          fontWeight: '500',
        },
      }),
    });
  },
  control: controlCallback,
  menuPortal: base => ({
    ...base,
    zIndex: 9999,
    backgroundColor: 'var(--bs-popover-bg)',
    color: 'var(--bs-body-color)',
    borderColor: 'var(--bs-border-secondary-color)',
  }),
  singleValue: (provided) => {
    return {
      ...provided,
      color: 'var(--bs-body-color)',
    };
  },
  multiValue: (provided) => {
    return {
      ...provided,
      color: 'var(--bs-body-color)',
    };
  },
  multiValueRemove: (styles) => ({
    ...styles,
    color: '#909090',
    ':hover': {
      backgroundColor: 'transparent',
      color: '#666',
    },
  }),
  input: (styles) => ({
    ...styles,
    color: 'var(--bs-body-color)',
  }),
  placeholder: (provided, state) => {
    const { isDisabled } = state;
    return {
      ...provided,
      color: '#868e96',
      opacity: isDisabled ? 0.65 : 1,
    };
  },
  indicatorSeparator: (styles, state) => {
    if (state.selectProps.isMulti) {
      return styles;
    }
    return {
      'display': 'none'
    };
  }
};

export { MenuSelectStyle };
