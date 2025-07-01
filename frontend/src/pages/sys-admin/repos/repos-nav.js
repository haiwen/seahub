import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../../utils/constants';
import SortMenu from '../../../components/sort-menu';

const propTypes = {
  currentItem: PropTypes.string.isRequired,
  sortBy: PropTypes.string,
  sortItems: PropTypes.func
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      { name: 'all', urlPart: 'all-libraries', text: gettext('All') },
      { name: 'wikis', urlPart: 'all-wikis', text: gettext('Wikis') },
      { name: 'system', urlPart: 'system-library', text: gettext('System') },
      { name: 'trash', urlPart: 'trash-libraries', text: gettext('Trash') }
    ];
    this.sortOptions = [
      { value: 'file_count-desc', text: gettext('Descending by files') },
      { value: 'size-desc', text: gettext('Descending by size') }
    ];
  }

  onSelectSortOption = (item) => {
    const [sortBy,] = item.value.split('-');
    this.props.sortItems(sortBy);
  };

  render() {
    const { currentItem, sortBy, sortOrder = 'desc' } = this.props;
    const showSortIcon = currentItem == 'all' || currentItem == 'wikis';
    return (
      <div className="cur-view-path tab-nav-container">
        <ul className="nav">
          {this.navItems.map((item, index) => {
            return (
              <li className="nav-item" key={index}>
                <Link to={`${siteRoot}sys/${item.urlPart}/`} className={`nav-link${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
              </li>
            );
          })}
        </ul>
        {showSortIcon &&
          <SortMenu
            sortBy={sortBy}
            sortOrder={sortOrder}
            sortOptions={this.sortOptions}
            onSelectSortOption={this.onSelectSortOption}
          />
        }
      </div>
    );
  }
}

Nav.propTypes = propTypes;

export default Nav;
