import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import editUtilties from './utils/editor-utilties';
import SidePanel from './pages/drafts/side-panel';
import MainPanel from './pages/drafts/main-panel';

import 'seafile-ui';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/layout.css';
import './css/common.css';
import './css/toolbar.css';

class Drafts extends Component {

  constructor(props) {
    super(props);
    this.state = {
      draftList: [],
      isLoadingDraft: true,
    };
  }

  componentDidMount() {
    this.initDraftList();
  }

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

  render() {
    return (
      <div id="main">
        <SidePanel></SidePanel>
        <MainPanel 
          isLoadingDraft={this.state.isLoadingDraft}
          draftList={this.state.draftList}
          deleteDraft={this.deleteDraft}
          publishDraft={this.publishDraft}
        />
      </div>
    );
  }
}

ReactDOM.render(
  <Drafts />,
  document.getElementById('wrapper')
);
