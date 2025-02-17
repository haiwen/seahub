import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../utils/constants';

import '../css/item-dropdown-menu.css';

const propTypes = {
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  onSelectSortOption: PropTypes.func.isRequired
};

class SortMenu extends React.Component {

  constructor(props) {
    super(props);
    this.sortOptions = [
      { value: 'name-asc', text: gettext('By name ascending') },
      { value: 'name-desc', text: gettext('By name descending') },
      { value: 'size-asc', text: gettext('By size ascending') },
      { value: 'size-desc', text: gettext('By size descending') },
      { value: 'time-asc', text: gettext('By time ascending') },
      { value: 'time-desc', text: gettext('By time descending') }
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
          tag="span"
          data-toggle="dropdown"
          title={gettext('Switch sort mode')}
          aria-label={gettext('Switch sort mode')}
          aria-expanded={isDropdownMenuOpen}
        >
          <span className="cur-view-path-btn px-1" role="button">
            <i className="sf3-font-sort2 sf3-font"></i>
            <i className="sf3-font-down sf3-font"></i>
          </span>
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
