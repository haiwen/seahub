import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import Icon from '../../../components/icon';
import CustomDropdown from '../../../components/dropdown';

class FilterMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {};
  }

  handleDropdownOpen = () => {
    this.props.toggleFreezeItem(true);
  };

  handleDropdownClose = () => {
    this.props.toggleFreezeItem(false);
  };

  handleItemClick = () => {
    this.props.filterItems();
    this.props.toggleFreezeItem(false);
  };

  getMenuItems = () => {
    const { filterBy } = this.props;
    return [
      { key: 'only-show', label: gettext('only show {placeholder}').replace('{placeholder}', filterBy), onClick: this.handleItemClick },
    ];
  };

  render() {
    return (
      <CustomDropdown
        items={this.getMenuItems()}
        trigger={<Icon symbol="down" />}
        triggerClassName="sf-dropdown-toggle"
        freezeItem={this.handleDropdownOpen}
        unfreezeItem={this.handleDropdownClose}
      />
    );
  }
}

FilterMenu.propTypes = {
  toggleFreezeItem: PropTypes.func.isRequired,
  filterItems: PropTypes.func.isRequired,
  filterBy: PropTypes.string.isRequired,
};

export default FilterMenu;
