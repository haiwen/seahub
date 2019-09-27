import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@reach/router';

const gettext = window.gettext;
const siteRoot = window.app.config.siteRoot;

const propTypes = {
  currentTab: PropTypes.string.isRequired,
  onTabClick: PropTypes.func.isRequired,
};

class SidePanel extends React.Component {

  onTabClick = (tab) => {
    this.props.onTabClick(tab);
  }

  getActiveClass = (tab) => {
    return this.props.currentTab === tab ? 'active' : '';
  }

  render() {
    let imgUrl = siteRoot + 'media/img/dtable-logo.png'
    return (
      <div className="side-panel">
        <div className="side-panel-north dtable-header">
          <div className="dtable-logo">
            <img src={imgUrl} height="32" />
          </div>
        </div>
        <div className="side-panel-center">
          <div className="dtable-side-nav">
            <h3 className="dtable-nav-title">{gettext('Main')}</h3>
            <ul className="nav nav-pills flex-column dtable-nav-list">
              <li className={`nav-item dtable-nav-item ${this.getActiveClass('dtable')}`} title={gettext('DTable')} onClick={this.onTabClick.bind(this, 'dtable')}>
                <Link to={siteRoot + 'dtable/'} className="nav-link dtable-nav-link">
                  <span className="sf3-font sf3-font-dtable-logo nav-icon"></span>
                  <span className="nav-text">{gettext('DTable')}</span>
                </Link>
              </li>
              <li className={`nav-item dtable-nav-item ${this.getActiveClass('apps')}`} title={gettext('Apps')} onClick={this.onTabClick.bind(this, 'apps')}>
                <Link to={siteRoot + 'dtable/apps/'} className="nav-link dtable-nav-link">
                  <span className="dtable-font dtable-icon-apps nav-icon"></span>
                  <span className="nav-text">{gettext('Apps')}</span>
                </Link>
              </li>
              <li className={`nav-item dtable-nav-item ${this.getActiveClass('templetes')}`} title={gettext('Templetes')} onClick={this.onTabClick.bind(this, 'templetes')}>
                <Link to={siteRoot + 'dtable/templetes/'} className="nav-link dtable-nav-link">
                  <span className="dtable-font dtable-icon-templates nav-icon"></span>
                  <span className="nav-text">{gettext('Templetes')}</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
