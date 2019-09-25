import React from 'react';
import PropTypes from 'prop-types';
import { Router } from '@reach/router';
import Notification from '../../components/common/notification';
import Account from '../../components/common/account';
import Search from '../../components/search/search';
import MainPanelDTables from './main-panel-dtables';
import MainPanelApps from './main-panel-apps';
import MainPanelTempletes from './main-panel-templetes';

import '../../css/search.css';

const siteRoot = window.app.config.siteRoot;


const propTypes = {

};

class MainPanel extends React.Component {

  onSearchedClick = () => {
    console.log(6543)
    //todo
  }

  render() {

    let searchPlaceholder = this.props.searchPlaceholder || 'Search Dtables';

    return (
      <div className="main-panel">
        <div className="main-panel-north dtable-header">
          <div className="common-toolbar">
            <Search 
              placeholder={searchPlaceholder}
              onSearchedClick={this.onSearchedClick}
            />
            <Notification />
            <Account />
          </div>
        </div>
        <Router className="reach-router">
          <MainPanelDTables path={siteRoot + 'dtable/'} />
          <MainPanelApps path={siteRoot + 'dtable/apps/'} />
          <MainPanelTempletes path={siteRoot + 'dtable/templetes/'} />
        </Router>
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
