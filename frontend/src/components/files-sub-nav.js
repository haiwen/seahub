import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import {
  gettext, siteRoot, canAddRepo, canViewOrg, enableOCM, enableOCMViaWebdav
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
                className={`nav-link ellipsis ${this.getActiveClass(item.name)}`}
                onClick={(e) => this.tabItemClick(e, item.name, item.id)}
              >
                <span className={`${item.parent_group_id == 0 ? 'sf3-font-group' : 'sf3-font-department'} sf3-font nav-icon`} aria-hidden="true"></span>
                <span className="nav-text">{item.name}</span>
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
            <Link to={ siteRoot + 'my-libs/' } className={`nav-link ellipsis ${this.getActiveClass('my-libs') || this.getActiveClass('deleted') }`} title={gettext('My Libraries')} onClick={(e) => this.tabItemClick(e, 'my-libs')}>
              <span className="sf3-font-mine sf3-font nav-icon" aria-hidden="true"></span>
              <span className="nav-text">{gettext('My Libraries')}</span>
            </Link>
          </li>
        )}
        <li className={`nav-item ${this.getActiveClass('shared-libs')}`}>
          <Link to={siteRoot + 'shared-libs/'} className={`nav-link ellipsis ${this.getActiveClass('shared-libs')}`} title={gettext('Shared with me')} onClick={(e) => this.tabItemClick(e, 'shared-libs')}>
            <span className="sf3-font-share-with-me sf3-font nav-icon" aria-hidden="true"></span>
            <span className="nav-text">{gettext('Shared with me')}</span>
          </Link>
        </li>
        {canViewOrg &&
        <li className={`nav-item ${this.getActiveClass('org')}`} onClick={(e) => this.tabItemClick(e, 'org')}>
          <Link to={ siteRoot + 'org/' } className={`nav-link ellipsis ${this.getActiveClass('org')}`} title={gettext('Shared with all')}>
            <span className="sf3-font-share-with-all sf3-font nav-icon" aria-hidden="true"></span>
            <span className="nav-text">{gettext('Shared with all')}</span>
          </Link>
        </li>
        }
        {enableOCM &&
        <li className={`nav-item ${this.getActiveClass('shared-with-ocm')}`}>
          <Link
            to={siteRoot + 'shared-with-ocm/'}
            className={`nav-link ellipsis ${this.getActiveClass('shared-with-ocm')}`}
            title={gettext('Shared from other servers')}
            onClick={(e) => this.tabItemClick(e, 'shared-with-ocm')}
          >
            <span className="sf3-font-share-with-me sf3-font nav-icon" aria-hidden="true"></span>
            <span className="nav-text">{gettext('Shared from other servers')}</span>
          </Link>
        </li>
        }
        {enableOCMViaWebdav &&
        <li className={`nav-item ${this.getActiveClass('ocm-via-webdav')}`}>
          <Link
            to={siteRoot + 'ocm-via-webdav/'}
            className={`nav-link ellipsis ${this.getActiveClass('ocm-via-webdav')}`}
            title={gettext('Shared from other servers')}
            onClick={(e) => this.tabItemClick(e, 'ocm-via-webdav')}
          >
            <span className="sf3-font-share-with-me sf3-font nav-icon" aria-hidden="true"></span>
            <span className="nav-text">{gettext('Shared from other servers')}</span>
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
