import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../utils/constants';
import { ROW_HEIGHT } from '../metadata/constants';
import Icon from './icon';
import Tooltip from './tooltip';

import '../css/set-row-height.css';

const ROW_HEIGHT_OPTIONS = [
  { label: gettext('Default'), icon: 'default', value: ROW_HEIGHT },
  { label: gettext('Double'), icon: 'double', value: 56 },
  { label: gettext('Triple'), icon: 'triple', value: 88 },
  { label: gettext('Quadruple'), icon: 'quadruple', value: 128 },
];

const propTypes = {
  rowHeight: PropTypes.number,
  modifyRowHeight: PropTypes.func,
  iconClass: PropTypes.string,
  readOnly: PropTypes.bool,
};

class SetRowHeight extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isDropdownMenuOpen: false,
    };
  }

  toggleDropdownMenu = () => {
    this.setState({
      isDropdownMenuOpen: !this.state.isDropdownMenuOpen,
    });
  };

  onChangeRowHeight = (value) => {
    const { readOnly = false, rowHeight = ROW_HEIGHT, modifyRowHeight } = this.props;
    if (readOnly || value === rowHeight) return;

    modifyRowHeight(value);
    this.setState({
      isDropdownMenuOpen: false,
    });
  };

  render() {
    const { isDropdownMenuOpen } = this.state;
    const { rowHeight = ROW_HEIGHT, iconClass } = this.props;
    const currentOption = ROW_HEIGHT_OPTIONS.find(item => item.value === rowHeight) || ROW_HEIGHT_OPTIONS[0];

    return (
      <Dropdown isOpen={isDropdownMenuOpen} toggle={this.toggleDropdownMenu}>
        <DropdownToggle
          id="set-row-height-toggle"
          tag="span"
          role="button"
          tabIndex="0"
          className={iconClass}
          data-toggle="dropdown"
          aria-label={gettext('Set row height')}
          aria-expanded={isDropdownMenuOpen}
        >
          <Icon symbol={`row-height-${currentOption.icon}`} />
          <Tooltip target="set-row-height-toggle">{gettext('Set row height')}</Tooltip>
        </DropdownToggle>
        <DropdownMenu className="mt-1 set-row-height-dropdown-menu">
          <div className="set-row-height-dropdown-title">{gettext('Select row height')}</div>
          {ROW_HEIGHT_OPTIONS.map((item, index) => {
            return (
              <DropdownItem
                className="p-0"
                key={index}
                onClick={() => this.onChangeRowHeight(item.value)}
              >
                <div className="set-row-height-dropdown-wrapper">
                  <span className="set-row-height-dropdown-tick">
                    {rowHeight === item.value && <Icon symbol="check-thin" className="dropdown-item-icon" />}
                  </span>
                  <span className="set-row-height-dropdown-content d-flex align-items-center">
                    <Icon symbol={`row-height-${item.icon}`} className="dropdown-item-icon mr-2" />
                    <span>{item.label}</span>
                  </span>
                </div>
              </DropdownItem>
            );
          })}
        </DropdownMenu>
      </Dropdown>
    );
  }
}

SetRowHeight.propTypes = propTypes;

export default SetRowHeight;
