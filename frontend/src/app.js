import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@reach/router'
import SidePanel from './components/side-panel';
import MainPanel from './components/main-panel';
import DraftView from './pages/drafts/draft-view';
import FilesActivities from './pages/dashboard/files-activities';

import 'seafile-ui';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/layout.css';
import './css/common.css';
import './css/toolbar.css';
import './css/search.css';

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
    };
  }

  render() {
    let  href = window.location.href.split('/');
    let currentTab = href[href.length - 2];
    
    return (
      <div id="main">
        <SidePanel isOpen={this.state.isOpen} toggleClose={this.isOpen} currentTab={currentTab} />

        <MainPanel path='/'>
          <Router>
            <FilesActivities path='dashboard' />
            <DraftView path='drafts' />
          </Router>
        </MainPanel>
      </div>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('wrapper')
);
