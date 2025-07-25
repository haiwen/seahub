import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext, isPro } from '../../../utils/constants';
import { NAV_ITEM_MARGIN } from '../../../constants';

const propTypes = {
  currentItem: PropTypes.string.isRequired
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      { name: 'desktop', urlPart: 'desktop', text: gettext('Desktop') },
      { name: 'mobile', urlPart: 'mobile', text: gettext('Mobile') }
    ];
    if (isPro) {
      this.navItems.push({ name: 'errors', urlPart: 'errors', text: gettext('Errors') });
    }
    this.itemRefs = [];
  }

  componentDidMount() {
    this.forceUpdate();
  }

  render() {
    const { currentItem } = this.props;
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
                <Link to={`${siteRoot}sys/devices/${item.urlPart}/`} className={`m-0 nav-link${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
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
