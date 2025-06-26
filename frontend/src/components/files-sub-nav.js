import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import {
  gettext, siteRoot, canAddRepo, canViewOrg
} from '../utils/constants';

const propTypes = {
  currentTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tabItemClick: PropTypes.func.isRequired,
};

class FilesSubNav extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      groupItems: []
    };
  }

  tabItemClick = (e, param, id) => {
    this.props.tabItemClick(e, param, id);
  };

  getActiveClass = (tab) => {
    return this.props.currentTab === tab ? 'active' : '';
  };

  renderSharedGroups() {
    return (
      <>
        {this.props.groupItems.map(item => {
          return (
            <li key={item.id} className={`nav-item ${this.getActiveClass(item.name)}`}>
              <Link
                to={siteRoot + 'group/' + item.id + '/'}
                className={`nav-link ${this.getActiveClass(item.name)}`}
                onClick={(e) => this.tabItemClick(e, item.name, item.id)}
              >
                <span className={`${item.parent_group_id == 0 ? 'sf3-font-group' : 'sf3-font-department'} sf3-font nav-icon`} aria-hidden="true"></span>
                <span className="nav-text ellipsis" title={item.name}>{item.name}</span>
              </Link>
            </li>
          );
        })}
      </>
    );
  }

  render() {
    return (
      <>
        {canAddRepo && (
          <li className={`nav-item ${this.getActiveClass('my-libs') || this.getActiveClass('deleted')}`}>
            <Link
              to={siteRoot + 'my-libs/'}
              className={`nav-link ${this.getActiveClass('my-libs') || this.getActiveClass('deleted') }`}
              onClick={(e) => this.tabItemClick(e, 'my-libs')}
            >
              <span className="sf3-font-mine sf3-font nav-icon" aria-hidden="true"></span>
              <span className="nav-text ellipsis" title={gettext('My Libraries')}>{gettext('My Libraries')}</span>
            </Link>
          </li>
        )}
        <li className={`nav-item ${this.getActiveClass('shared-libs')}`}>
          <Link
            to={siteRoot + 'shared-libs/'}
            className={`nav-link ${this.getActiveClass('shared-libs')}`}
            onClick={(e) => this.tabItemClick(e, 'shared-libs')}
          >
            <span className="sf3-font-share-with-me sf3-font nav-icon" aria-hidden="true"></span>
            <span className="nav-text ellipsis" title={gettext('Shared with me')}>{gettext('Shared with me')}</span>
          </Link>
        </li>
        {canViewOrg &&
        <li className={`nav-item ${this.getActiveClass('org')}`}>
          <Link
            to={siteRoot + 'org/'}
            className={`nav-link ${this.getActiveClass('org')}`}
            onClick={(e) => this.tabItemClick(e, 'org')}
          >
            <span className="sf3-font-share-with-all sf3-font nav-icon" aria-hidden="true"></span>
            <span className="nav-text ellipsis" title={gettext('Shared with all')}>{gettext('Shared with all')}</span>
          </Link>
        </li>
        }
        {this.renderSharedGroups()}
      </>
    );
  }
}

FilesSubNav.propTypes = propTypes;

export default FilesSubNav;
