import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@reach/router';
import { gettext, siteRoot, canUseExRepos } from '../utils/constants';


const propTypes = {
  currentTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tabItemClick: PropTypes.func.isRequired,
  draftCounts: PropTypes.number,
};

class GuestMainSideNav extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      groupsExtended: false,
      sharedExtended: false,
      closeSideBar:false,
      groupItems: [],
    };

    this.listHeight = 24; //for caculate tabheight
    this.groupsHeight = 0;
    this.adminHeight = 0;
  }


  tabItemClick = (e, param, id) => {
    if (window.uploader &&
      window.uploader.isUploadProgressDialogShow &&
      window.uploader.totalProgress !== 100) {
      if (!window.confirm(gettext('A file is being uploaded. Are you sure you want to leave this page?'))) {
        e.preventDefault();
        return false;
      }
      window.uploader.isUploadProgressDialogShow = false;
    }
    this.props.tabItemClick(param, id);
  }


  getActiveClass = (tab) => {
    return this.props.currentTab === tab ? 'active' : '';
  }



  render() {
    return (
      <div className="side-nav">
        <div className="side-nav-con">
          <h3 className="sf-heading">{gettext('Files')}</h3>
          <ul className="nav nav-pills flex-column nav-container">
            {canUseExRepos && (
              <li className="nav-item">
                <Link to={ siteRoot + 'ex-libs/' } className={`nav-link ellipsis ${this.getActiveClass('ex-libs') || this.getActiveClass('deleted') }`} title={'外部资料库'} onClick={(e) => this.tabItemClick(e, 'ex-libs')}>
                  <span className="sf2-icon-user" aria-hidden="true"></span>
                  <span className="nav-text">{'外部资料库'}</span>
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    );
  }
}

GuestMainSideNav.propTypes = propTypes;

export default GuestMainSideNav;
