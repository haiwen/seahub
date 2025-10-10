import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../utils/constants';

import '../css/item-dropdown-menu.css';

const propTypes = {
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  sortOptions: PropTypes.array,
  onSelectSortOption: PropTypes.func.isRequired
};

class SortMenu extends React.Component {

  constructor(props) {
    super(props);
    this.sortOptions = this.props.sortOptions || [
      { value: 'name-asc', text: gettext('Ascending by name') },
      { value: 'name-desc', text: gettext('Descending by name') },
      { value: 'size-asc', text: gettext('Ascending by size') },
      { value: 'size-desc', text: gettext('Descending by size') },
      { value: 'time-asc', text: gettext('Ascending by time') },
      { value: 'time-desc', text: gettext('Descending by time') }
    ];
    this.state = {
      isDropdownMenuOpen: false
    };
  }

  toggleDropdownMenu = () => {
    this.setState({
      isDropdownMenuOpen: !this.state.isDropdownMenuOpen
    });
  };

  render() {
    const { isDropdownMenuOpen } = this.state;
    const { sortBy, sortOrder } = this.props;
    const sortOptions = this.sortOptions.map(item => {
      return {
        ...item,
        isSelected: item.value == `${sortBy}-${sortOrder}`
      };
    });

    return (
      <Dropdown
        isOpen={isDropdownMenuOpen}
        toggle={this.toggleDropdownMenu}
      >
        <DropdownToggle
          className="border-0 font-weight-normal cur-view-path-btn px-1"
          title={gettext('Switch sort mode')}
          data-toggle="dropdown"
          aria-label={gettext('Switch sort mode')}
          aria-expanded={isDropdownMenuOpen}
        >
          <i className="sf3-font-sort2 sf3-font"></i>
        </DropdownToggle>
        <DropdownMenu className="mt-1">
          {sortOptions.map((item, index) => {
            return (
              <DropdownItem key={index} onClick={this.props.onSelectSortOption.bind(this, item)} className="pl-5 position-relative">
                {item.isSelected && <i className="dropdown-item-tick sf2-icon-tick"></i>}
                {item.text}
              </DropdownItem>
            );
          })}
        </DropdownMenu>
      </Dropdown>
    );
  }

}

SortMenu.propTypes = propTypes;

export default SortMenu;
