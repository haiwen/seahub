import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@reach/router';
import { siteRoot } from './utils/constants';
import SidePanel from './components/side-panel';
import MainPanel from './components/main-panel';
import DraftsView from './pages/drafts/drafts-view';
import DraftContent from './pages/drafts/draft-content';
import ReviewContent from './pages/drafts/review-content';
import FilesActivities from './pages/dashboard/files-activities';
import Starred from './pages/starred/starred';
import LinkedDevices from './pages/linked-devices/linked-devices';
import editUtilties from './utils/editor-utilties';
import ShareAdminLibraries from './pages/share-admin/libraries';
import ShareAdminFolders from './pages/share-admin/folders';
import ShareAdminShareLinks from './pages/share-admin/share-links';
import ShareAdminUploadLinks from './pages/share-admin/upload-links';
import SharedLibraries from './pages/shared-libs/shared-libs';

import 'seafile-ui';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/layout.css';
import './css/toolbar.css';
import './css/search.css';

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      isSidePanelClosed: false,
      draftCounts: 0,
      draftList:[],
      isLoadingDraft: true,
      currentTab: 'dashboard',
    };
  }

  componentDidMount() {
    // e.g.  from http://127.0.0.1:8000/drafts/reviews/
    // get reviews  
    // TODO: need refactor later
    let href = window.location.href.split('/');
    this.getDrafts();
    this.setState({
      currentTab: href[href.length - 2]
    });
  }

  getDrafts = () => {
    editUtilties.listDrafts().then(res => {
      this.setState({
        draftCounts: res.data.draft_counts,
        draftList: res.data.data, 
        isLoadingDraft: false,
      }); 
    });
  }

  updateDraftsList = (draft_id) => {
    this.setState({
      draftCounts: this.state.draftCounts - 1,
      draftList: this.state.draftList.filter(draft => draft.id != draft_id), 
    });
  }

  onCloseSidePanel = () => {
    this.setState({
      isSidePanelClosed: !this.state.isSidePanelClosed
    });
  }

  onShowSidePanel = () => {
    this.setState({
      isSidePanelClosed: !this.state.isSidePanelClosed
    });
  }

  tabItemClick = (param) => {
    this.setState({
      currentTab: param
    });
  } 

  render() {
    let { currentTab } = this.state;

    return (
      <div id="main">
        <SidePanel isSidePanelClosed={this.state.isSidePanelClosed} onCloseSidePanel={this.onCloseSidePanel} currentTab={currentTab} tabItemClick={this.tabItemClick} draftCounts={this.state.draftCounts} />

        <MainPanel onShowSidePanel={this.onShowSidePanel}>
          <Router>
            <FilesActivities path={siteRoot + 'dashboard'} />
            <DraftsView path={siteRoot + 'drafts'}  tabItemClick={this.tabItemClick} currentTab={currentTab}>
              <DraftContent path='/' getDrafts={this.getDrafts} 
                isLoadingDraft={this.state.isLoadingDraft}
                draftList={this.state.draftList}
                updateDraftsList={this.updateDraftsList}
              />
              <ReviewContent path='reviews' />
            </DraftsView>
            <Starred path={siteRoot + 'starred'} />
            <LinkedDevices path={siteRoot + 'linked-devices'} />
            <ShareAdminLibraries path={siteRoot + 'share-admin-libs'} />
            <ShareAdminFolders path={siteRoot + 'share-admin-folders'} />
            <ShareAdminShareLinks path={siteRoot + 'share-admin-share-links'} />
            <ShareAdminUploadLinks path={siteRoot + 'share-admin-upload-links'} />
            <SharedLibraries path={siteRoot + 'shared-libs'} />
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
