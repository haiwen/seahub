import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../utils/constants';

const propTypes = {
  sortOptions: PropTypes.array,
  onSelectSortOption: PropTypes.func.isRequired
};

class ReposSortMenu extends React.Component {

  constructor(props) {
    super(props);
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
    const { sortOptions } = this.props;
    return (
      <Dropdown
        isOpen={isDropdownMenuOpen}
        toggle={this.toggleDropdownMenu}
      >
        <DropdownToggle
          tag="div"
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
        <DropdownMenu right={true} className="mt-1">
          {sortOptions.map((item, index) => {
            return (
              <DropdownItem key={index} onClick={this.props.onSelectSortOption.bind(this, item)}>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="mr-8">{item.text}</span>
                  <span>{item.isSelected && <i className="sf2-icon-tick"></i>}</span>
                </div>
              </DropdownItem>
            );
          })}
        </DropdownMenu>
      </Dropdown>
    );
  }

}

ReposSortMenu.propTypes = propTypes;

export default ReposSortMenu;
