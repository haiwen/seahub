import React from 'react';
import PropTypes from 'prop-types';
import { Router } from '@reach/router'
import MainPanelDtables from './main-panel-dtables';
import MainPanelApps from './main-panel-apps';
import MainPanelTempletes from './main-panel-templetes';


const siteRoot = window.app.config.siteRoot;


const propTypes = {

};

class MainPanel extends React.Component {

  render() {
    return (
      <div className="main-panel">
        <div className="main-panel-north dtable-header">
          <div className="common-toolbar">
            <div className="search" title={'Search'}>Search</div>
            <div className="notification" title={'Notification'}>Notification</div>
            <div className="avatar" title={'Avatar'}></div>
          </div>
        </div>
        <Router className="reach-router">
          <MainPanelDtables path={siteRoot + 'dtable/'} />
          <MainPanelApps path={siteRoot + 'dtable/apps/'} />
          <MainPanelTempletes path={siteRoot + 'dtable/templetes/'} />
        </Router>
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
