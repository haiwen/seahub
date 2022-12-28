import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../../utils/constants';

const propTypes = {
  currentItem: PropTypes.string.isRequired
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      {name: 'info', urlPart: 'info', text: gettext('Info')},
      {name: 'members', urlPart: 'members', text: gettext('Members')},
      {name: 'admins', urlPart: 'admins', text: gettext('Admins')},
    ];
  }

  render() {
    const { currentItem, institutionID, institutionName } = this.props;
    return (
      <div>
        <div className="cur-view-path">
          <h3 className="sf-heading"><Link to={`${siteRoot}sys/institutions/`}>{gettext('Institutions')}</Link> / {institutionName}</h3>
        </div>
        <ul className="nav border-bottom mx-4">
          {this.navItems.map((item, index) => {
            return (
              <li className="nav-item mr-2" key={index}>
                <Link to={`${siteRoot}sys/institutions/${institutionID}/${item.urlPart}/`} className={`nav-link ${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
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
