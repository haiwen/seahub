import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../../utils/constants';
import SortMenu from '../../../components/sort-menu';
import { NAV_ITEM_MARGIN } from '../../../constants';

const propTypes = {
  currentItem: PropTypes.string.isRequired,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  sortItems: PropTypes.func
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      { name: 'shareLinks', urlPart: 'share-links', text: gettext('Share Links') },
      { name: 'uploadLinks', urlPart: 'upload-links', text: gettext('Upload Links') },
    ];

    this.sortOptions = [
      { value: 'ctime-asc', text: gettext('Ascending by creation time') },
      { value: 'ctime-desc', text: gettext('Descending by creation time') },
      { value: 'view_cnt-asc', text: gettext('Ascending by visit count') },
      { value: 'view_cnt-desc', text: gettext('Descending by visit count') }
    ];
    this.itemRefs = [];
  }

  componentDidMount() {
    this.forceUpdate();
  }

  onSelectSortOption = (item) => {
    const [sortBy, sortOrder] = item.value.split('-');
    this.props.sortItems(sortBy, sortOrder);
  };

  render() {
    const { currentItem, sortBy, sortOrder } = this.props;
    const showSortIcon = currentItem == 'shareLinks';
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
