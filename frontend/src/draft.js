import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
/* eslint-disable */
import Prism from 'prismjs';
/* eslint-enable */
import { siteRoot, gettext } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import axios from 'axios';
import DiffViewer from '@seafile/seafile-editor/dist/viewer/diff-viewer';
import { serialize } from '@seafile/seafile-editor/dist/utils/slate2markdown/serialize';
import Loading from './components/loading';
import toaster from './components/toast';
import ReviewComments from './components/review-list-view/review-comments';
import ReviewCommentDialog from './components/review-list-view/review-comment-dialog.js';
import { Tooltip } from 'reactstrap';
import AddReviewerDialog from './components/dialog/add-reviewer-dialog.js';
import { findRange } from '@seafile/slate-react';
import { Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import classnames from 'classnames';
import HistoryList from './pages/review/history-list';
import { Value, Document, Block } from 'slate';

import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/layout.css';
import './css/toolbar.css';
import './css/dirent-detail.css';
import './css/draft-review.css';

require('@seafile/seafile-editor/dist/editor/code-hight-package');
const { draftID, draftFileName, draftRepoID, draftFilePath, draftOriginFilePath, originFileExists } = window.draft.config;

class Draft extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      draftContent: '',
      draftOriginContent: '',
      isLoading: true,
      isShowDiff: true,
      showDiffTip: false,
      activeTab: 'reviewInfo',
      commentsNumber: null,
    };
  }

  componentDidMount() {
    this.initialContent();
  }

  initialContent = () => {
    if (!originFileExists) {
      seafileAPI.getFileDownloadLink(draftRepoID, draftFilePath)
        .then(res => { 
          seafileAPI.getFileContent(res.data)
            .then(res => {
              this.setState({
                draftContent: res.data,
                draftOriginContent: res.data,
                isLoading: false,
                isShowDiff: false
              }); 
            });
        });
      return;
    }

    axios.all([
      seafileAPI.getFileDownloadLink(draftRepoID, draftFilePath),
      seafileAPI.getFileDownloadLink(draftRepoID, draftOriginFilePath)
    ]).then(axios.spread((res1, res2) => {
      axios.all([
        seafileAPI.getFileContent(res1.data),
        seafileAPI.getFileContent(res2.data)
      ]).then(axios.spread((draftContent, draftOriginContent) => {
        this.setState({
          draftContent: draftContent.data,
          draftOriginContent: draftOriginContent.data,
          isLoading: false
        }); 
      }));
    }));
  }

  showDiffViewer = () => {
    return (
      <div>
        {this.state.isShowDiff ?
          <DiffViewer
            newMarkdownContent={this.state.draftContent}
            oldMarkdownContent={this.state.draftOriginContent}
            ref="diffViewer"
          /> :
          <DiffViewer
            newMarkdownContent={this.state.draftContent}
            oldMarkdownContent={this.state.draftContent}
            ref="diffViewer"
          />
        }
      </div>
    );
  }

  onSwitchShowDiff = () => {
    this.setState({
      isShowDiff: !this.state.isShowDiff,
    });
  }

  toggleDiffTip = () => {
    this.setState({
      showDiffTip: !this.state.showDiffTip
    });
  }


  showDiffButton = () => {
    return (
      <div className={'seafile-toggle-diff'}>
        <label className="custom-switch" id="toggle-diff">
          <input type="checkbox" checked={this.state.isShowDiff && 'checked'}
            name="option" className="custom-switch-input"
            onChange={this.onSwitchShowDiff}/>
          <span className="custom-switch-indicator"></span>
        </label>
        <Tooltip placement="bottom" isOpen={this.state.showDiffTip}
          target="toggle-diff" toggle={this.toggleDiffTip}>
          {gettext('View diff')}</Tooltip>
      </div>
    );
  }

  onPublishDraft = () => {
    const OriginFileLink = siteRoot + 'lib/' + draftRepoID + '/file' + draftOriginFilePath + '/';
    seafileAPI.publishDraft(draftID).then(res => {
      window.location.href = OriginFileLink; 
    })
  }

  tabItemClick = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab
      });
    }
  }


  showNavItem = (showTab) => {
    switch(showTab) {
      case 'info':
        return (
          <NavItem className="nav-item">
            <NavLink
              className={classnames({ active: this.state.activeTab === 'reviewInfo' })}
              onClick={() => { this.tabItemClick('reviewInfo');}}
            >
              <i className="fas fa-info-circle"></i>
            </NavLink>
          </NavItem>
        );
      case 'comments':
        return (
          <NavItem className="nav-item">
            <NavLink
              className={classnames({ active: this.state.activeTab === 'comments' })}
              onClick={() => {this.tabItemClick('comments');}}
            >
              <i className="fa fa-comments"></i>
              {this.state.commentsNumber > 0 && <div className='comments-number'>{this.state.commentsNumber}</div>}
            </NavLink>
          </NavItem>
        );
      case 'history':
        return (
          <NavItem className="nav-item">
            <NavLink
              className={classnames({ active: this.state.activeTab === 'history' })}
              onClick={() => { this.tabItemClick('history');}}
            >
              <i className="fas fa-history"></i>
            </NavLink>
          </NavItem>
        );
    }
  } 

  renderNavItems = () => {
    return (
      <Nav tabs className="review-side-panel-nav">
        {this.showNavItem('info')}
        {this.showNavItem('comments')}
        {this.showNavItem('history')}
      </Nav>
    );
  }

  render() {
    const draftLink = siteRoot + 'lib/' + draftRepoID + '/file' + draftFilePath + '?mode=edit';
    const OriginFileLink = siteRoot + 'lib/' + draftRepoID + '/file' + draftOriginFilePath + '/';
    return(
      <div className="wrapper">
        <div id="header" className="header review">
          <div className="cur-file-info">
            <div className="info-item file-feature">
              <span className="sf2-icon-review"></span>
            </div>
            <div className="info-item file-info">
              <React.Fragment>
                <span className="file-name">{draftFileName}</span>
                <a href={draftLink} className="draft-link">{gettext('Edit draft')}</a>
              </React.Fragment>
            </div>
          </div>
          <div className="button-group">
            {this.showDiffButton()}
            <button 
              className='btn btn-success file-operation-btn' 
              title={gettext('Publish draft')}
              onClick={this.onPublishDraft}
            >
              {gettext('Publish')}
            </button>
          </div>
        </div>

        <div id="main" className="main">
          <div className="cur-view-container">
            <div className='cur-view-content'>
              {this.state.isLoading ?
                <div className="markdown-viewer-render-content article">
                  <Loading /> 
                </div> 
                :
                <div className="markdown-viewer-render-content article">
                  {this.showDiffViewer()}
                </div>
              }
            </div>
          </div>
          <div className="cur-view-right-part">
            <div className="seafile-comment-resize"></div>
            <div className="review-side-panel">
              {this.renderNavItems()}
              <TabContent activeTab={this.state.activeTab}>
                <TabPane tabId="reviewInfo">
                  review info
                </TabPane>
                <TabPane tabId="comments" className="comments">
                  comments
                </TabPane>
                <TabPane tabId="history" className="history">
                  history list
                </TabPane>
              </TabContent>
            </div>
          </div>
        </div>
      </div>
    );
  }
}


ReactDOM.render (
  <Draft />,
  document.getElementById('wrapper')
);
