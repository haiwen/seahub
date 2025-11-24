import React from 'react';
import PropTypes from 'prop-types';
import Select, { components } from 'react-select';
import { MenuSelectStyle } from './seahub-select-style';

const DropdownIndicator = props => {
  return (
    components.DropdownIndicator && (
      <components.DropdownIndicator {...props}>
        <span className="sf3-font sf3-font-down" style={{ fontSize: '12px', marginLeft: '-2px' }}></span>
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
      <span className="sf3-font sf3-font-x-01" style={{ fontSize: '12px', marginLeft: '-2px' }}></span>
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

class SeahubSelect extends React.Component {

  getMenuPortalTarget = () => {
    const { menuPortalTarget = '.modal' } = this.props;
    return document.querySelector(menuPortalTarget);
  };

  render() {
    const { options = [], onChange, value = {}, isSearchable = true, placeholder = '',
      isMulti = false, menuPosition, isClearable = true, noOptionsMessage = (() => { return null; }),
      classNamePrefix, innerRef, isDisabled = false, form, className } = this.props;

    return (
      <Select
        value={value}
        isDisabled={isDisabled}
        ref={innerRef}
        onChange={onChange}
        options={options}
        isMulti={isMulti}
        className={className}
        classNamePrefix={classNamePrefix}
        styles={MenuSelectStyle}
        components={{ Option, DropdownIndicator, MenuList, ClearIndicator }}
        placeholder={placeholder}
        isSearchable={isSearchable}
        isClearable={isClearable}
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
