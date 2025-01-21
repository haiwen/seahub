import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';

import '../../css/single-dropdown-toolbar.css';

const propTypes = {
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
      <Fragment>
        <Dropdown isOpen={this.state.isDropdownMenuOpen} toggle={this.toggleDropdownMenu}>
          <DropdownToggle
            tag="span"
            role="button"
            className={withPlusIcon ? 'ml-2 sf-dropdown-combined-toggle' : 'ml-1 sf-dropdown-toggle'}
            onClick={this.toggleDropdownMenu}
            onKeyDown={this.onDropdownToggleKeyDown}
            data-toggle="dropdown"
          >
            {withPlusIcon
              ? (<><i className="sf3-font-new sf3-font main-icon"></i><i className="sf3-font-down sf3-font"></i></>)
              : <i className="sf3-font-down sf3-font"></i>
            }
          </DropdownToggle>
          <DropdownMenu>
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
      </Fragment>
    );
  }
}

SingleDropdownToolbar.propTypes = propTypes;

export default SingleDropdownToolbar;
