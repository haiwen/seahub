import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import Icon from '../../../components/icon';

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
  };

  onItemClick = () => {
    this.props.filterItems();
    this.props.toggleFreezeItem(false);
  };

  render() {
    const { filterBy } = this.props;
    return (
      <Dropdown isOpen={this.state.isMenuShown} toggle={this.toggleMenu}>
        <DropdownToggle
          tag="span"
          className="sf-dropdown-toggle"
          title={gettext('More operations')}
          aria-label={gettext('More operations')}
          data-toggle="dropdown"
          aria-expanded={this.state.isMenuShown}
        >
          <Icon symbol="down" />
        </DropdownToggle>
        <DropdownMenu>
          <DropdownItem onClick={this.onItemClick}>{gettext('only show {placeholder}').replace('{placeholder}', filterBy)}</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  }
}

FilterMenu.propTypes = {
  toggleFreezeItem: PropTypes.func.isRequired,
  filterItems: PropTypes.func.isRequired,
  filterBy: PropTypes.string.isRequired,
};

export default FilterMenu;
