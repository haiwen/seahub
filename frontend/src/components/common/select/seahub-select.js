import React from 'react';
import PropTypes from 'prop-types';
import Select, { components } from 'react-select';
import { MenuSelectStyle } from './seahub-select-style';
import Icon from '../../icon';
import './seahub-select.css';

const DropdownIndicator = props => {
  return (
    components.DropdownIndicator && (
      <components.DropdownIndicator {...props}>
        <span className="d-flex align-items-center" style={{ marginLeft: '-2px' }} aria-hidden="true">
          <Icon symbol="down" style={{ width: '12px', height: '12px' }} />
        </span>
      </components.DropdownIndicator>
    )
  );
};

const ClearIndicator = ({ innerProps, ...props }) => {
  const onMouseDown = e => {
    e.nativeEvent.stopImmediatePropagation();
    innerProps.onMouseDown(e);
  };
  props.innerProps = { ...innerProps, onMouseDown };
  return (
    <components.ClearIndicator {...props} >
      <span className="d-flex align-items-center" style={{ marginLeft: '-2px' }} aria-hidden="true">
        <Icon symbol="close" style={{ width: '12px', height: '12px' }} />
      </span>
    </components.ClearIndicator>
  );
};

ClearIndicator.propTypes = {
  innerProps: PropTypes.object,
};

const MenuList = (props) => (
  <div onClick={e => e.nativeEvent.stopImmediatePropagation()} onMouseDown={e => e.nativeEvent.stopImmediatePropagation()} >
    <components.MenuList {...props}>{props.children}</components.MenuList>
  </div>
);

MenuList.propTypes = {
  children: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

const Option = props => {
  return (
    <div style={props.data.style}>
      <components.Option {...props} />
    </div>
  );
};

Option.propTypes = {
  data: PropTypes.shape({
    style: PropTypes.object,
  }),
};

const ValueContainer = ({ children, ...props }) => {
  // Do not show '--'
  const isClearOption = props.selectProps.value?.value === null;
  if (isClearOption) {
    return (
      <components.ValueContainer {...props}/>
    );
  }
  return (
    <components.ValueContainer {...props} className='seahub-select-value-container'>
      {children}
    </components.ValueContainer>
  );
};

class SeahubSelect extends React.Component {

  getMenuPortalTarget = () => {
    const { menuPortalTarget = '.modal' } = this.props;
    return document.querySelector(menuPortalTarget);
  };

  render() {
    const { options = [], onChange, value = {}, isSearchable = false, placeholder = '',
      isMulti = false, menuPosition, isClearable = true, noOptionsMessage = (() => { return null; }),
      classNamePrefix, innerRef, isDisabled = false, form, className = '' } = this.props;

    if (isClearable) {
      if (value && value.label !== '--' && options[0].label !== '--') {
        options.unshift({ value: null, label: '--' });
      }
      if (value && value.label === '--' && options[0].label === '--') {
        options.shift();
      }
    }
    const optionsWithCheck = options.map(option => {
      const isSelected = value && value.value === option.value;
      return {
        ...option,
        label: (
          <span className="d-flex align-items-center justify-content-between">
            {option.label}
            {isSelected && <Icon symbol="check" style={{ width: '12px', height: '12px' }} />}
          </span>
        )
      };
    });

    return (
      <Select
        value={value}
        isDisabled={isDisabled}
        ref={innerRef}
        onChange={onChange}
        options={optionsWithCheck}
        isMulti={isMulti}
        className={className}
        classNamePrefix={classNamePrefix}
        styles={MenuSelectStyle}
        components={{ Option, DropdownIndicator, MenuList, ClearIndicator, ValueContainer }}
        placeholder={placeholder}
        isSearchable={isSearchable}
        isClearable={false}
        menuPosition={menuPosition || 'fixed'} // when use default menuPosition(absolute), menuPortalTarget is unnecessary.
        menuShouldScrollIntoView
        menuPortalTarget={this.getMenuPortalTarget()}
        captureMenuScroll={false}
        noOptionsMessage={noOptionsMessage}
        form={form}
      />
    );
  }
}

SeahubSelect.propTypes = {
  isMulti: PropTypes.bool,
  options: PropTypes.array.isRequired,
  value: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.string]),
  isSearchable: PropTypes.bool,
  isClearable: PropTypes.bool,
  placeholder: PropTypes.string,
  classNamePrefix: PropTypes.string,
  className: PropTypes.string,
  form: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  menuPortalTarget: PropTypes.string,
  menuPosition: PropTypes.string,
  noOptionsMessage: PropTypes.func,
  innerRef: PropTypes.object,
  isDisabled: PropTypes.bool,
};

export default SeahubSelect;
