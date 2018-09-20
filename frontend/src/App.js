import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import editUtilties from './utils/editor-utilties';
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

const VIEW_MODULE = {
  'DRAFTS': 'drafts',
  'DASHBOARD': 'dashboard',
}

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      draftList: [],
      isLoadingDraft: true
    };
  }

  componentDidMount() {
    this.initDraftList();
  }

  // begin activities handler

  // end activities handler

  // begin draft handler
  initDraftList() {
    editUtilties.listDrafts().then(res => {
      this.setState({
        draftList: res.data.data,
        isLoadingDraft: false,
      });
    });
  }

  deleteDraft = (draft) => {
    editUtilties.deleteDraft(draft.id).then(res => {
      this.initDraftList();
    });
  }

  publishDraft = (draft) => {
    editUtilties.publishDraft(draft.id).then(res => {
      this.initDraftList();
    });
  }
  // end draft handler

  renderCurrentView(currentTab) {
    if (currentTab === VIEW_MODULE.DRAFTS) {
      return (
        <DraftView 
          isLoadingDraft={this.state.isLoadingDraft}
          draftList={this.state.draftList}
          deleteDraft={this.deleteDraft}
          publishDraft={this.publishDraft}
        />
      );
    }

    if (currentTab === VIEW_MODULE.DASHBOARD) {
      return (
        <FilesActivities />
      )
    }
  }

  render() {
    let  href = window.location.href.split('/');
    let currentTab = href[href.length - 2];
    
    return (
      <div id="main">
        <SidePanel isOpen={this.state.isOpen} toggleClose={this.isOpen} currentTab={currentTab}></SidePanel>
        <MainPanel isOpen={this.state.isOpen} childModule={this.renderCurrentView(currentTab)} />
      </div>
    );
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('wrapper')
);
