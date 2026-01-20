import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';
import Icon from '../icon';

import '../../css/single-dropdown-toolbar.css';

const propTypes = {
  withPlusIcon: PropTypes.bool,
  opList: PropTypes.array.isRequired
};

class SingleDropdownToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isDropdownMenuOpen: false
    };
  }

  toggleDropdownMenu = () => {
    this.setState({ isDropdownMenuOpen: !this.state.isDropdownMenuOpen });
  };

  onDropdownToggleKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.toggleDropdownMenu();
    }
  };

  onMenuItemKeyDown = (item, e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      item.onClick();
    }
  };

  render() {
    const { opList, withPlusIcon = false } = this.props;

    return (
      <Dropdown isOpen={this.state.isDropdownMenuOpen} toggle={this.toggleDropdownMenu} direction="down">
        <DropdownToggle
          tag="span"
          role="button"
          tabIndex="0"
          className={`d-flex align-items-center ${withPlusIcon ? 'ml-2 sf-dropdown-combined-toggle' : 'ml-1 sf-dropdown-toggle'}`}
          onClick={this.toggleDropdownMenu}
          onKeyDown={this.onDropdownToggleKeyDown}
          data-toggle="dropdown"
          aria-label={gettext('Operations')}
          aria-expanded={this.state.isDropdownMenuOpen}
        >
          {withPlusIcon && <Icon symbol="new" className="w-4 h-4 new-icon" />}
          <Icon symbol="arrow-down" className="w-3 h-3" />
        </DropdownToggle>
        <DropdownMenu className='position-fixed'>
          {opList.map((item, index) => {
            if (item == 'Divider') {
              return <DropdownItem key={index} divider />;
            } else {
              return (
                <DropdownItem key={index} onClick={item.onClick} onKeyDown={this.onMenuItemKeyDown.bind(this, item)}>
                  {item.text}
                </DropdownItem>
              );
            }
          })}
        </DropdownMenu>
      </Dropdown>
    );
  }
}

SingleDropdownToolbar.propTypes = propTypes;

export default SingleDropdownToolbar;
