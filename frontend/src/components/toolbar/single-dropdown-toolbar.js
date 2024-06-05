import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';

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
    this.setState({isDropdownMenuOpen: !this.state.isDropdownMenuOpen});
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
    const { opList } = this.props;

    return (
      <Fragment>
        <Dropdown isOpen={this.state.isDropdownMenuOpen} toggle={this.toggleDropdownMenu}>
          <DropdownToggle
            tag="i"
            role="button"
            className="sf3-font-drop-down sf3-font ml-1 sf-dropdown-toggle"
            onClick={this.toggleDropdownMenu}
            onKeyDown={this.onDropdownToggleKeyDown}
            data-toggle="dropdown"
          >
          </DropdownToggle>
          <DropdownMenu style={{'width': '200px'}}>
            {opList.map((item, index)=> {
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
