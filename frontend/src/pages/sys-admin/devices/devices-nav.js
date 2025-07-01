import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext, isPro } from '../../../utils/constants';

const propTypes = {
  currentItem: PropTypes.string.isRequired
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      { name: 'desktop', urlPart: 'desktop-devices', text: gettext('Desktop') },
      { name: 'mobile', urlPart: 'mobile-devices', text: gettext('Mobile') }
    ];
    if (isPro) {
      this.navItems.push({ name: 'errors', urlPart: 'device-errors', text: gettext('Errors') });
    }
    this.itemRefs = [];
    this.itemWidths = [];
  }

  componentDidMount() {
    this.measureItems();
  }

  measureItems = () => {
    this.itemWidths = this.itemRefs.map(ref => ref?.offsetWidth || 77);
  };

  render() {
    const { currentItem } = this.props;
    const activeIndex = this.navItems.findIndex(item => item.name === currentItem) || 0;
    const indicatorWidth = this.itemWidths[activeIndex] || 77;
    const indicatorOffset = this.itemWidths.slice(0, activeIndex).reduce((a, b) => a + b, 0);

    return (
      <div className="cur-view-path tab-nav-container">
        <ul
          className="nav devices-nav-indicator-container position-relative"
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
                <Link to={`${siteRoot}sys/${item.urlPart}/`} className={`nav-link${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
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
