import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../../utils/constants';
import SortMenu from '../../../components/sort-menu';
import { NAV_ITEM_MARGIN } from '../../../constants';

const propTypes = {
  currentItem: PropTypes.string.isRequired,
  sortBy: PropTypes.string,
  sortItems: PropTypes.func
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      { name: 'all-libraries', urlPart: 'all-libraries', text: gettext('All') },
      { name: 'all-wikis', urlPart: 'all-wikis', text: gettext('Wikis') },
      { name: 'system-library', urlPart: 'system-library', text: gettext('System') },
      { name: 'trash-libraries', urlPart: 'trash-libraries', text: gettext('Trash') }
    ];
    this.sortOptions = [
      { value: 'file_count-desc', text: gettext('Descending by files') },
      { value: 'size-desc', text: gettext('Descending by size') }
    ];
    this.itemRefs = [];
  }

  componentDidMount() {
    this.forceUpdate();
  }

  onSelectSortOption = (item) => {
    const [sortBy,] = item.value.split('-');
    this.props.sortItems(sortBy);
  };

  render() {
    const { currentItem, sortBy, sortOrder = 'desc' } = this.props;
    const showSortIcon = currentItem == 'all-libraries' || currentItem == 'all-wikis';
    const menuSortOrder = showSortIcon ? 'desc' : sortOrder;
    const activeIndex = this.navItems.findIndex(item => item.name === currentItem) || 0;
    const itemWidths = this.itemRefs.map(ref => ref?.offsetWidth);
    const indicatorWidth = itemWidths[activeIndex];
    const indicatorOffset = itemWidths.slice(0, activeIndex).reduce((a, b) => a + b, 0) + (2 * activeIndex + 1) * NAV_ITEM_MARGIN;

    return (
      <div className="cur-view-path tab-nav-container">
        <ul
          className="nav nav-indicator-container position-relative"
          style={{
            '--indicator-width': `${indicatorWidth}px`,
            '--indicator-offset': `${indicatorOffset}px`
          }}
        >
          {this.navItems.map((item, index) => {
            return (
              <li
                className="nav-item mx-3"
                key={index}
                ref={el => this.itemRefs[index] = el}
              >
                <Link to={`${siteRoot}sys/${item.urlPart}/`} className={`m-0 nav-link${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
              </li>
            );
          })}
        </ul>
        {showSortIcon &&
          <SortMenu
            sortBy={sortBy}
            sortOrder={menuSortOrder}
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
