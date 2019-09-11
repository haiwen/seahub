import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@reach/router';
import { siteRoot, gettext } from '../../../utils/constants';

const propTypes = {
  currentItem: PropTypes.string.isRequired,
  groupID: PropTypes.string.isRequired
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      {name: 'repos', urlPart: 'groups/' + this.props.groupID + '/libs', text: gettext('Libraries')},
      {name: 'members', urlPart: 'groups/' + this.props.groupID + '/members', text: gettext('Members')}
    ];
  }

  render() {
    const { currentItem } = this.props;
    return (
      <div className="cur-view-path tab-nav-container">
        <ul className="nav">
          {this.navItems.map((item, index) => {
            return (
              <li className="nav-item" key={index}>
                <Link to={`${siteRoot}sys/${item.urlPart}/`} className={`nav-link ${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
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
