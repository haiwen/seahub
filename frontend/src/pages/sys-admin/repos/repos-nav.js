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
      { name: 'all', urlPart: 'all', text: gettext('All') },
      { name: 'wikis', urlPart: 'wikis', text: gettext('Wikis') },
      { name: 'system', urlPart: 'system', text: gettext('System') },
      { name: 'trash', urlPart: 'trash', text: gettext('Trash') }
    ];
    this.sortOptions = [
      { value: 'file_count-desc', text: gettext('Descending by files') },
      { value: 'size-desc', text: gettext('Descending by size') }
    ];
    this.itemRefs = [];
    this.itemWidths = [];
  }

  componentDidMount() {
    this.measureItems();
  }

  componentDidUpdate(prevProps) {
    if (this.props.currentItem !== prevProps.currentItem) {
      this.measureItems();
    }
  }

  onSelectSortOption = (item) => {
    const [sortBy,] = item.value.split('-');
    this.props.sortItems(sortBy);
  };

  measureItems = () => {
    this.itemWidths = this.itemRefs.map(ref => ref?.offsetWidth || 77);
    this.forceUpdate();
  };

  render() {
    const { currentItem, sortBy, sortOrder = 'desc' } = this.props;
    const showSortIcon = currentItem == 'all' || currentItem == 'wikis';
    const activeIndex = this.navItems.findIndex(item => item.name === currentItem) || 0;
    const indicatorWidth = this.itemWidths[activeIndex] || 56;
    const indicatorOffset = this.itemWidths.slice(0, activeIndex).reduce((a, b) => a + b, 0);

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
                className="nav-item"
                key={index}
                ref={el => this.itemRefs[index] = el}
              >
                <Link to={`${siteRoot}sys/libraries/${item.urlPart}/`} className={`nav-link${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
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
