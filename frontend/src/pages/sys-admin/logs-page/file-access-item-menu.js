import React from 'react';
import { gettext } from '../../../utils/constants';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';

class FilterMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = { 
      isMenuShown: false
    };  
  }

  toggleMenu = () => {
    this.setState({
      isMenuShown: !this.state.isMenuShown
    }, () => {
      this.props.toggleFreezeItem(this.state.isMenuShown);
    });
  }

  onItemClick = () => {
    this.props.filterItems();
    this.props.toggleFreezeItem(false);
  }

  render() {
    const { filterBy } = this.props;
    return (
      <Dropdown isOpen={this.state.isMenuShown} toggle={this.toggleMenu}>
        <DropdownToggle
          tag="i"
          className="sf-dropdown-toggle sf2-icon-caret-down"
          title={gettext('More Operations')}
          data-toggle="dropdown"
          aria-expanded={this.state.isMenuShown}
        />
        <DropdownMenu>
          <DropdownItem onClick={this.onItemClick}>{gettext('only show {placeholder}').replace('{placeholder}', filterBy)}</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  }
}

export default FilterMenu;
