import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
/* eslint-disable */
import Prism from 'prismjs';
/* eslint-enable */
import { siteRoot, gettext, draftOriginFilePath, draftFilePath, draftOriginRepoID,
  opStatus, publishFileVersion, originFileVersion, author, authorAvatar, 
  draftFileExists, originFileExists, draftID, draftFileName, draftRepoID } from './utils/constants';
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
import ModalPortal from './components/modal-portal';

import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/layout.css';
import './css/toolbar.css';
import './css/dirent-detail.css';
import './css/draft.css';

require('@seafile/seafile-editor/dist/editor/code-hight-package');

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
      changedNodes: [],
      originRepoName: '',
      isShowCommentDialog: false,
      unresolvedComments: 0,
      activeItem: null,
      historyList: [],
      showReviewerDialog: false,
      reviewers: [],
    };
    this.quote = '';
    this.newIndex = null;
    this.oldIndex = null;
    this.changeIndex = -1;
    this.range = null;
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

    const hash = window.location.hash;
    if (hash.indexOf('#history-') === 0) {
      const currentCommitID = hash.slice(9, 49);
      const preCommitID = hash.slice(50, 90);
      this.setState({
        isLoading: false,
        activeTab: 'history',
      });
      seafileAPI.listFileHistoryRecords(draftOriginRepoID, draftFilePath, 1, 25).then((res) => {
        const historyList = res.data.data;
        this.setState({
          historyList: historyList,
          totalReversionCount: res.data.total_count
        });
        for (let i = 0, length = historyList.length; i < length; i++) {
          if (preCommitID === historyList[i].commit_id) {
            this.setState({
              activeItem: i
            });
            break;
          }
        }
      });
      axios.all([
        seafileAPI.getFileRevision(draftOriginRepoID, currentCommitID, draftFilePath),
        seafileAPI.getFileRevision(draftOriginRepoID, preCommitID, draftFilePath)
      ]).then(axios.spread((res1, res2) => {
        axios.all([seafileAPI.getFileContent(res1.data), seafileAPI.getFileContent(res2.data)]).then(axios.spread((content1,content2) => {
          this.setDiffViewerContent(content2.data, content1.data);
        }));
      }));
      return;
    } else {
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
          let that = this;
          setTimeout(() => {
            that.getChangedNodes();
          }, 100);
        }));
      }));
    }

  }

  onHistoryItemClick = (currentCommitID, preCommitID, activeItem) => {
    const url = 'history-' + preCommitID + '-' + currentCommitID;
    this.setURL(url);
    this.setState({
      activeItem: activeItem
    });

    axios.all([
      seafileAPI.getFileRevision(draftOriginRepoID, currentCommitID, draftFilePath),
      seafileAPI.getFileRevision(draftOriginRepoID, preCommitID, draftFilePath)
    ]).then(axios.spread((res1, res2) => {
      axios.all([seafileAPI.getFileContent(res1.data), seafileAPI.getFileContent(res2.data)]).then(axios.spread((content1,content2) => {
        this.setDiffViewerContent(content1.data, content2.data);
      }));
    }));
  }

  onHistoryListChange = (historyList) => {
    this.setState({
      historyList: historyList
    });
  }

  componentWillMount() {
    this.getCommentsNumber();
    this.getOriginRepoInfo();
  }

  getCommentsNumber = () => {
    seafileAPI.listComments(draftRepoID, draftFilePath).then((res) => {
      let number = res.data.total_count;
      let comments = res.data.comments;
      let unresolvedComments = 0;
      for (let i = 0; i < res.data.total_count; i++) {
        if (comments[i].resolved === false) {
          unresolvedComments++;
        }
      }
      this.setState({
        commentsNumber: number,
        unresolvedComments: unresolvedComments,
      });
    });
  }

  // new comment APIs
  // getCommentsNumber() {
  //   return seafileAPI.getCommentsNumber(draftRepoID, draftFilePath);
  // }

  // postComment(comment, detail) {
  //   return seafileAPI.postComment(draftRepoID, draftFilePath, comment, detail);
  // }

  // listComments() {
  //   return seafileAPI.listComments(draftRepoID, draftFilePath);
  // }

  // updateComment(commentID, resolved, detail) {
  //   return seafileAPI.updateComment(draftRepoID, commentID, resolved, detail);
  // }

  // deleteComment(commentID) {
  //   return seafileAPI.deleteComment(draftRepoID, commentID);
  // }

  addComment = (e) => {
    e.stopPropagation();
    this.getQuote();
    if (!this.quote) {
      return;
    }
    this.setState({
      isShowCommentDialog: true
    });
  }

  onCommentAdded = () => {
    this.getCommentsNumber();
    this.toggleCommentDialog();
  }

  toggleCommentDialog = () => {
    this.setState({
      isShowCommentDialog: !this.state.isShowCommentDialog
    });
  }

  getOriginRepoInfo = () => {
    seafileAPI.getRepoInfo(draftOriginRepoID).then((res) => {
      this.setState({
        originRepoName: res.data.repo_name
      });
    });
  }

  getChangedNodes = () => {
    const nodes = this.refs.diffViewer.value.document.nodes;
    let keys = [];
    let lastDiffState = '';
    nodes.map((node) => {
      if (node.data.get('diff_state') === 'diff-added' && lastDiffState !== 'diff-added') {
        keys.push(node.key);
      } else if (node.data.get('diff_state') === 'diff-removed' && lastDiffState !== 'diff-removed') {
        keys.push(node.key);
      } else if (node.data.get('diff_state') === 'diff-replaced' && lastDiffState !== 'diff-replaced') {
        keys.push(node.key);
      }
      lastDiffState = node.data.get('diff_state');
    });
    this.setState({
      changedNodes: keys
    });
  }

  scrollToChangedNode = (scroll) => {
    if (this.state.changedNodes.length == 0) return;
    if (scroll === 'up') { this.changeIndex++; } else { this.changeIndex--; }
    if (this.changeIndex > this.state.changedNodes.length - 1) {
      this.changeIndex = 0;
    }
    if (this.changeIndex < 0) {
      this.changeIndex = this.state.changedNodes.length - 1;
    }
    const win = window;
    let key = this.state.changedNodes[this.changeIndex];
    let element = win.document.querySelector(`[data-key="${key}"]`);
    // fix code-block or tables
    while (element.className.indexOf('diff-') === -1 && element.tagName !== 'BODY') {
      element = element.parentNode;
    }
    const scroller = this.findScrollContainer(element, win);
    const isWindow = scroller == win.document.body || scroller == win.document.documentElement;
    if (isWindow) {
      win.scrollTo(0, element.offsetTop);
    } else {
      scroller.scrollTop = element.offsetTop;
    }
  }

  findScrollContainer = (element, window) => {
    let parent = element.parentNode;
    const OVERFLOWS = ['auto', 'overlay', 'scroll'];
    let scroller;
    while (!scroller) {
      if (!parent.parentNode) break;
      const style = window.getComputedStyle(parent);
      const { overflowY } = style;
      if (OVERFLOWS.includes(overflowY)) {
        scroller = parent;
        break;
      }
      parent = parent.parentNode;
    }
    if (!scroller) {
      return window.document.body;
    }
    return scroller;
  }

  scrollToQuote = (newIndex, oldIndex, quote) => {
    const nodes = this.refs.diffViewer.value.document.nodes;
    let key;
    nodes.map((node) => {
      if (node.data.get('old_index') == oldIndex && node.data.get('new_index') == newIndex) {
        key = node.key;
      }
    });
    if (typeof(key) !== 'string') {
      nodes.map((node) => {
        if (node.text.indexOf(quote) > 0) {
          key = node.key;
        }
      });
    }
    if (typeof(key) === 'string') {
      const win = window;
      let element = win.document.querySelector(`[data-key="${key}"]`);
      while (element.tagName === 'CODE') {
        element = element.parentNode;
      }
      const scroller = this.findScrollContainer(element, win);
      const isWindow = scroller == win.document.body || scroller == win.document.documentElement;
      if (isWindow) {
        win.scrollTo(0, element.offsetTop);
      } else {
        scroller.scrollTop = element.offsetTop;
      }
    }
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

  listReviewers = () => {
    seafileAPI.listDraftReviewers(draftID).then((res) => {
      this.setState({
        reviewers: res.data.reviewers
      });
    });
  }

  onSwitchShowDiff = () => {
    if (!this.state.isShowDiff) {
      let that = this;
      setTimeout(() => {
        that.getChangedNodes();
      }, 100);
    }
    this.setState({
      isShowDiff: !this.state.isShowDiff,
    });
  }

  toggleDiffTip = () => {
    this.setState({
      showDiffTip: !this.state.showDiffTip
    });
  }

  toggleAddReviewerDialog = () => {
    if (this.state.showReviewerDialog) {
      this.listReviewers();
    }
    this.setState({
      showReviewerDialog: !this.state.showReviewerDialog
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

  initialDiffViewerContent = () => {
    seafileAPI.listFileHistoryRecords(draftOriginRepoID, draftFilePath, 1, 25).then((res) => {
      this.setState({
        historyList: res.data.data,
        totalReversionCount: res.data.total_count
      });
      if (res.data.data.length > 1) {
        axios.all([
          seafileAPI.getFileRevision(draftOriginRepoID, res.data.data[0].commit_id, draftFilePath),
          seafileAPI.getFileRevision(draftOriginRepoID, res.data.data[1].commit_id, draftFilePath)
        ]).then(axios.spread((res1, res2) => {
          axios.all([seafileAPI.getFileContent(res1.data), seafileAPI.getFileContent(res2.data)]).then(axios.spread((content1,content2) => {
            this.setState({
              draftContent: content1.data,
              draftOriginContent: content2.data
            });
          }));
        }));
      } else {
        seafileAPI.getFileRevision(draftOriginRepoID, res.data.data[0].commit_id, draftFilePath).then((res) => {
          seafileAPI.getFileContent(res.data).then((content) => {
            this.setState({
              draftContent: content.data,
              draftOriginContent: ''
            });
          });
        });
      }
    });
  }

  setURL = (newurl) => {
    let url = new URL(window.location.href);
    // bug
    url.set('hash', newurl);
    window.location.href = url.toString();
  }

  tabItemClick = (tab) => {
    if (this.state.activeTab !== tab) {
      if (tab !== 'history') {
        // this.setURL('#');
      }
      if (tab == 'reviewInfo') { 
        this.initialContent();
      }
      else if (tab == 'history'){
        this.initialDiffViewerContent();
      }
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

  // add inResizing
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
                  <div className="review-side-panel-body">
                    <SidePanelReviewers
                      reviewers={this.state.reviewers}
                      toggleAddReviewerDialog={this.toggleAddReviewerDialog}/>
                    <SidePanelAuthor/>
                    <UnresolvedComments number={this.state.unresolvedComments}/>
                    {(this.state.isShowDiff === true && this.state.changedNodes.length > 0) &&
                    <SidePanelChanges
                      changedNumber={this.state.changedNodes.length}
                      scrollToChangedNode={this.scrollToChangedNode}/>
                    }
                    <SidePanelOrigin originRepoName={this.state.originRepoName}/>
                    <a href={draftLink}><Button color="secondary">{gettext('Edit Draft')}</Button></a>
                  </div>
                </TabPane>
                <TabPane tabId="comments" className="comments">
                  <ReviewComments
                    scrollToQuote={this.scrollToQuote}
                    getCommentsNumber={this.getCommentsNumber}
                    commentsNumber={this.state.commentsNumber}
                    inResizing={false}
                  />
                </TabPane>
                <TabPane tabId="history" className="history">
                  <HistoryList
                    activeItem={this.state.activeItem}
                    historyList={this.state.historyList}
                    totalReversionCount={this.state.totalReversionCount}
                    onHistoryItemClick={this.onHistoryItemClick}
                    onHistoryListChange={this.onHistoryListChange}
                  />
                </TabPane>
              </TabContent>
            </div>
          </div>
        </div>
        { this.state.showReviewerDialog &&
          <ModalPortal>
            <AddReviewerDialog
              showReviewerDialog={this.state.showReviewerDialog}
              toggleAddReviewerDialog={this.toggleAddReviewerDialog}
              draftID={draftID}
              reviewers={this.state.reviewers}
            />
          </ModalPortal>
        }
        {this.state.isShowCommentDialog &&
          <ModalPortal>
            <ReviewCommentDialog
              toggleCommentDialog={this.toggleCommentDialog}
              onCommentAdded={this.onCommentAdded}
              quote={this.quote}
              draftID={draftID}
              newIndex={this.newIndex}
              oldIndex={this.oldIndex}
            />
          </ModalPortal>
        }
      </div>
    );
  }
}


class SidePanelReviewers extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="review-side-panel-item">
        <div className="review-side-panel-header">{gettext('Reviewers')}
          <i className="fa fa-cog" onClick={this.props.toggleAddReviewerDialog}></i>
        </div>
        { this.props.reviewers.length > 0 ?
          this.props.reviewers.map((item, index = 0, arr) => {
            return (
              <div className="reviewer-info" key={index}>
                <img className="avatar review-side-panel-avatar" src={item.avatar_url} alt=""/>
                <span className="reviewer-name">{item.user_name}</span>
              </div>
            );
          })
          :
          <span>{gettext('No reviewer yet.')}</span>
        }
      </div>
    );
  }
}

const sidePanelReviewersPropTypes = {
  reviewers: PropTypes.array.isRequired,
  toggleAddReviewerDialog: PropTypes.func.isRequired
};

SidePanelReviewers.propTypes = sidePanelReviewersPropTypes;

class SidePanelAuthor extends React.Component {
  render() {
    return (
      <div className="review-side-panel-item">
        <div className="review-side-panel-header">{gettext('Author')}</div>
        <div className="author-info">
          <img className="avatar review-side-panel-avatar" src={authorAvatar} alt=""/>
          <span className="author-name">{author}</span>
        </div>
      </div>
    );
  }
}

class SidePanelOrigin extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="dirent-table-container">
        <table className="table-thead-hidden">
          <thead>
            <tr><th width="25%"></th><th width="75%"></th></tr>
          </thead>
          <tbody>
            <tr><th>{gettext('Location')}</th><td>{this.props.originRepoName}{draftOriginFilePath}</td></tr>
          </tbody>
        </table>
      </div>
    );
  }
}

const SidePanelOriginPropTypes = {
  originRepoName: PropTypes.string.isRequired
};

SidePanelOrigin.propTypes = SidePanelOriginPropTypes;


class UnresolvedComments extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="review-side-panel-item">
        <div className="review-side-panel-header">{gettext('Comments')}</div>
        <div className="changes-info">
          <span>{gettext('Unresolved comments:')}{' '}{this.props.number}</span>
        </div>
      </div>
    );
  }
}

const UnresolvedCommentsPropTypes = {
  number: PropTypes.number.isRequired
};

UnresolvedComments.propTypes = UnresolvedCommentsPropTypes;


class SidePanelChanges extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="review-side-panel-item">
        <div className="review-side-panel-header">{gettext('Changes')}</div>
        <div className="changes-info">
          <span>{gettext('Number of changes:')}{' '}{this.props.changedNumber}</span>
          { this.props.changedNumber > 0 &&
            <div>
              <i className="fa fa-arrow-circle-up" onClick={() => { this.props.scrollToChangedNode('down');}}></i>
              <i className="fa fa-arrow-circle-down" onClick={() => { this.props.scrollToChangedNode('up');}}></i>
            </div>
          }
        </div>
      </div>
    );
  }
}

const sidePanelChangesPropTypes = {
  changedNumber: PropTypes.number.isRequired,
  scrollToChangedNode: PropTypes.func.isRequired
};

SidePanelChanges.propTypes = sidePanelChangesPropTypes;


ReactDOM.render (
  <Draft />,
  document.getElementById('wrapper')
);
