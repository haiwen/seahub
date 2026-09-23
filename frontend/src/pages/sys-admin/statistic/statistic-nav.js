import React from 'react';
import { Link } from '@gatsbyjs/reach-router';
import PropTypes from 'prop-types';
import { ADMIN_NAV_ITEM_GAP } from '@/constants';
import { siteRoot, gettext } from '@/utils/constants';
import '@/css/system-stat.css';

const propTypes = {
  currentItem: PropTypes.string.isRequired
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      { name: 'fileStatistic', urlPart: 'statistics/file', text: gettext('File') },
      { name: 'storageStatistic', urlPart: 'statistics/storage', text: gettext('Storage') },
      { name: 'userStatistic', urlPart: 'statistics/user', text: gettext('Users') },
      { name: 'trafficStatistic', urlPart: 'statistics/traffic', text: gettext('Traffic') },
      { name: 'aiStatistic', urlPart: 'statistics/ai', text: gettext('AI Usage') },
      { name: 'reportsStatistic', urlPart: 'statistics/reports', text: gettext('Reports') },
      { name: 'metricsStatistic', urlPart: 'statistics/metrics', text: gettext('Metrics') },
    ];
    this.itemRefs = [];
  }

  componentDidMount() {
    this.forceUpdate();
  }

  render() {
    const { currentItem } = this.props;
    const activeIndex = this.navItems.findIndex(item => item.name === currentItem);
    const itemWidths = this.itemRefs.map(ref => ref?.offsetWidth);
    const indicatorWidth = itemWidths[activeIndex];
    const indicatorOffset = itemWidths.slice(0, activeIndex).reduce((a, b) => a + b, 0) + activeIndex * ADMIN_NAV_ITEM_GAP;

    return (
      <div className="cur-view-path tab-nav-container statistic-nav">
        <ul
          className="nav nav-indicator-container position-relative gap-6"
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
                <Link to={`${siteRoot}sys/${item.urlPart}/`} className={`m-0 nav-link${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}

Nav.propTypes = propTypes;

export default Nav;
