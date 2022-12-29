import React from 'react';
import ReactDom from 'react-dom';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
/* eslint-disable */
import Prism from 'prismjs';
/* eslint-enable */
import { DiffViewer, serialize } from '@seafile/seafile-editor';
import { siteRoot, gettext, draftOriginFilePath, draftFilePath, author, authorAvatar, originFileExists, draftFileExists, draftID, draftFileName, draftRepoID, draftStatus, draftPublishVersion, originFileVersion, filePermission, serviceURL, mediaUrl } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import axios from 'axios';
import Loading from './components/loading';
import ReviewComments from './components/review-list-view/review-comments';
import ReviewCommentDialog from './components/review-list-view/review-comment-dialog.js';
import { Tooltip } from 'reactstrap';
import AddReviewerDialog from './components/dialog/add-reviewer-dialog.js';
import  { ReactEditor }  from '@seafile/slate-react';
import { Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import classnames from 'classnames';
import HistoryList from './pages/review/history-list';
import { Range, Editor } from 'slate';
import ModalPortal from './components/modal-portal';
import reviewComment from './models/review-comment.js';

import './css/layout.css';
import './css/toolbar.css';
import './css/dirent-detail.css';
import './css/draft.css';

const URL = require('url-parse');
var moment = require('moment');

const { toSlateRange: findRange, toDOMNode } = ReactEditor;

class Draft extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      draftContent: '',
      draftOriginContent: '',
      draftInfo: {},
      isLoading: true,
      isShowDiff: true,
      showDiffTip: false,
      activeTab: 'reviewInfo',
      commentsList: [],
      changedNodes: [],
      originRepoName: '',
      isShowCommentDialog: false,
      activeItem: null,
      historyList: [],
      showReviewerDialog: false,
      reviewers: [],
      draftStatus: draftStatus,
    };
    this.quote = '';
    this.newIndex = null;
    this.oldIndex = null;
    this.changeIndex = -1;
    this.range = null;
  }

  initialContent = () => {
    switch(draftStatus) {
      case 'open':
        if (!draftFileExists) {
          this.setState({
            isLoading: false,
            isShowDiff: false
          });
          return;
        }

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
          let preItemFilePath, currentItemFilePath;
          this.setState({
            isLoading: false,
            activeTab: 'history',
          });
          seafileAPI.listFileHistoryRecords(draftRepoID, draftFilePath, 1, 25).then((res) => {
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
                preItemFilePath = historyList[i].path;
              }
              if (currentCommitID === historyList[i].commit_id) {
                currentItemFilePath = historyList[i].path;
              }
              if (preItemFilePath && currentItemFilePath) break;
            }
            axios.all([
              seafileAPI.getFileRevision(draftRepoID, currentCommitID, currentItemFilePath),
              seafileAPI.getFileRevision(draftRepoID, preCommitID, preItemFilePath)
            ]).then(axios.spread((res1, res2) => {
              axios.all([seafileAPI.getFileContent(res1.data), seafileAPI.getFileContent(res2.data)]).then(axios.spread((content1, content2) => {
                this.setDiffViewerContent(content2.data, content1.data);
              }));
            }));
            return;
          });
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
        break;
      case 'published':
        if (!originFileExists) {
          this.setState({
            isLoading: false,
            isShowDiff: false
          });
          return;
        }

        let dl0 = siteRoot + 'repo/' + draftRepoID + '/' + draftPublishVersion + '/download?' + 'p=' + draftOriginFilePath;
        let dl = siteRoot + 'repo/' + draftRepoID + '/' + originFileVersion + '/download?' + 'p=' + draftOriginFilePath;
        axios.all([
          seafileAPI.getFileContent(dl0),
          seafileAPI.getFileContent(dl)
        ]).then(axios.spread((draftContent, draftOriginContent) => {
          this.setState({
            draftContent: draftContent.data,
            draftOriginContent: draftOriginContent.data,
            isLoading: false,
          });
        }));
        break;
    }
  }

  onHistoryItemClick = (currentItem, preItem, activeItem) => {
    const preCommitID = preItem.commit_id;
    const currentCommitID = currentItem.commit_id;
    const url = 'history-' + preCommitID + '-' + currentCommitID;
    this.setURL(url);
    this.setState({
      activeItem: activeItem,
      isLoading: true,
    });
    axios.all([
      seafileAPI.getFileRevision(draftRepoID, currentCommitID, currentItem.path),
      seafileAPI.getFileRevision(draftRepoID, preCommitID, preItem.path)
    ]).then(axios.spread((res1, res2) => {
      axios.all([seafileAPI.getFileContent(res1.data), seafileAPI.getFileContent(res2.data)]).then(axios.spread((content1,content2) => {
        this.setDiffViewerContent(content1.data, content2.data);
      }));
    }));
  }

  onHistoryListChange = (historyList) => {
    this.setState({historyList: historyList });
  }

  listComments = () => {
    seafileAPI.listComments(draftRepoID, draftFilePath).then((res) => {
      let commentsList = [];
      res.data.comments.forEach((item) => {
        commentsList.push(new reviewComment(item));
      });
      this.setState({ commentsList: commentsList });
    });
  }

  addComment = (e) => {
    e.stopPropagation();
    this.getQuote();
    if (!this.quote) return;
    this.setState({ isShowCommentDialog: true });
  }

  onCommentAdded = () => {
    this.listComments();
    this.toggleCommentDialog();
  }

  toggleCommentDialog = () => {
    this.setState({
      isShowCommentDialog: !this.state.isShowCommentDialog
    });
  }

  getOriginRepoInfo = () => {
    seafileAPI.getRepoInfo(draftRepoID).then((res) => {
      this.setState({ originRepoName: res.data.repo_name });
    });
  }

  getDraftInfo = () => {
    if (draftStatus === 'open') {
      seafileAPI.getFileInfo(draftRepoID, draftFilePath).then((res) => {
        this.setState({ draftInfo: res.data });
      });
    }
  }

  getChangedNodes = () => {
    const nodes = this.refs.diffViewer.value;
    let keys = [];
    let lastDiffState = '';
    nodes.map((node, index) => {
      const diff_state = node.data['diff_state'];
      if (diff_state === 'diff-added' && lastDiffState !== 'diff-added') {
        keys.push(index);
      } else if (diff_state === 'diff-removed' && lastDiffState !== 'diff-removed') {
        keys.push(index);
      } else if (diff_state === 'diff-replaced' && lastDiffState !== 'diff-replaced') {
        keys.push(index);
      }
      lastDiffState = node.data.diff_state;
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
    let node = window.viewer.children[key];
    let element = toDOMNode(window.viewer, node);
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
    const nodes = this.refs.diffViewer.value;
    let commentNode = nodes.find((node) => {
      if (node.data['old_index'] == oldIndex && node.data['new_index'] == newIndex) {
        return node;
      }
    });
    if (commentNode) {
      const element = toDOMNode(window.viewer, commentNode);
      if (!element) return;
      const win = window;
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
            scriptSource={mediaUrl + 'js/mathjax/tex-svg.js'}
            newMarkdownContent={this.state.draftContent}
            oldMarkdownContent={this.state.draftOriginContent}
            ref="diffViewer"
          /> :
          <DiffViewer
            scriptSource={mediaUrl + 'js/mathjax/tex-svg.js'}
            newMarkdownContent={this.state.draftContent}
            oldMarkdownContent={this.state.draftContent}
            ref="diffViewer"
          />
        }
        <i className="fa fa-plus-square review-comment-btn" ref="commentbtn" onMouseDown={this.addComment}></i>
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
    seafileAPI.publishDraft(draftID).then(res => {
      this.setState({
        draftStatus: res.data.draft_status,
      });
    });
  }

  initialDiffViewerContent = () => {
    seafileAPI.listFileHistoryRecords(draftRepoID, draftFilePath, 1, 25).then((res) => {
      this.setState({
        historyList: res.data.data,
        totalReversionCount: res.data.total_count
      });
      if (res.data.data.length > 1) {
        axios.all([
          seafileAPI.getFileRevision(draftRepoID, res.data.data[0].commit_id, draftFilePath),
          seafileAPI.getFileRevision(draftRepoID, res.data.data[1].commit_id, draftFilePath)
        ]).then(axios.spread((res1, res2) => {
          axios.all([seafileAPI.getFileContent(res1.data), seafileAPI.getFileContent(res2.data)]).then(axios.spread((content1,content2) => {
            this.setState({
              draftContent: content1.data,
              draftOriginContent: content2.data
            });
          }));
        }));
      } else {
        seafileAPI.getFileRevision(draftRepoID, res.data.data[0].commit_id, draftFilePath).then((res) => {
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

  setDiffViewerContent = (newContent, prevContent) => {
    this.setState({
      draftContent: newContent,
      draftOriginContent: prevContent,
      isLoading: false,
    });
  }

  setURL = (newurl) => {
    let url = new URL(window.location.href);
    url.set('hash', newurl);
    window.location.href = url.toString();
  }

  tabItemClick = (tab) => {
    if (this.state.activeTab !== tab) {
      if (tab !== 'history' && window.location.hash) {
        this.setURL('#');
      }
      if (tab == 'reviewInfo') {
        this.initialContent();
      } else if (tab == 'history') {
        this.initialDiffViewerContent();
      }
      this.setState({
        activeTab: tab
      });
    }
  }

  showNavItem = (showTab) => {
    const commentsNumber = this.state.commentsList.length;
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
              {commentsNumber > 0 && <div className='comments-number'>{commentsNumber}</div>}
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

  getDomNodeByPath = (path) => {
    let node, parent = document.querySelector('.viewer-component');
    while(typeof path[0] === 'number' && parent) {
      node = parent.children[path[0]];
      if (!node.getAttribute('data-slate-node')) {
        node = node.children[0];
      }
      path.shift();
      parent = node;
    }
    return node;
  }

  setBtnPosition = () => {
    const nativeSelection = window.getSelection();
    if (!nativeSelection.rangeCount) {
      return;
    }
    const nativeRange = nativeSelection.getRangeAt(0);
    let selection = null;
    let style = this.refs.commentbtn.style;
    try {
      selection = findRange(window.viewer, nativeRange);
    } catch (err) {
      style.top = '-1000px';
      return;
    }
    if (!selection || Range.isCollapsed(selection)) {
      style.top = '-1000px';
      return;
    }
    this.range = selection;
    const focusNodePath = selection.anchor.path.slice();
    focusNodePath.pop();
    const focusNode = this.getDomNodeByPath(focusNodePath);
    style.right = '0px';

    if (focusNode) {
      style.top = `${focusNode.offsetTop}px`;
    } else {
      style.top = '-1000px';
    }
  }

  getQuote = () => {
    if (!this.range) return;
    this.quote = serialize(Editor.fragment(window.viewer, this.range));
    const node = window.viewer.children[this.range.anchor.path[0]];
    this.newIndex = node.data['new_index'];
    this.oldIndex = node.data['old_index'];
  }

  componentDidMount() {
    this.getOriginRepoInfo();
    this.getDraftInfo();
    this.listReviewers();
    this.listComments();
    this.initialContent();
    document.addEventListener('selectionchange', this.setBtnPosition);
  }

  componentWillUnmount() {
    document.removeEventListener('selectionchange', this.setBtnPosition);
  }

  renderDiffButton = () => {
    switch(draftStatus) {
      case 'open':
        if (!draftFileExists || !originFileExists) {
          return;
        }
        return this.showDiffButton();
      case 'published':
        if (!originFileExists) {
          return;
        }
        return this.showDiffButton();
    }
  }

  renderNavItems = () => {
    switch (draftStatus) {
      case 'open':
        if (!draftFileExists) {
          return (
            <Nav tabs className="review-side-panel-nav">
              {this.showNavItem('info')}
            </Nav>
          );
        }

        return (
          <Nav tabs className="review-side-panel-nav">
            {this.showNavItem('info')}
            {this.showNavItem('comments')}
            {this.showNavItem('history')}
          </Nav>
        );
      case 'published':
        if (!originFileExists) {
          return (
            <Nav tabs className="review-side-panel-nav">
              {this.showNavItem('info')}
            </Nav>
          );
        }
        return (
          <Nav tabs className="review-side-panel-nav">
            {this.showNavItem('info')}
            {this.showNavItem('comments')}
          </Nav>
        );
    }
  }

  renderContent = () => {
    switch(draftStatus) {
      case 'open':
        if (!draftFileExists) {
          return <p className="error">{gettext('Draft has been deleted.')}</p>;
        }
        return this.showDiffViewer();
      case 'published':
        if (!originFileExists) {
          return <p className="error">{gettext('Original file has been deleted.')}</p>;
        }
        return this.showDiffViewer();
    }
  }

  render() {
    const { draftInfo, reviewers, originRepoName, draftStatus } = this.state;
    const draftLink = siteRoot + 'lib/' + draftRepoID + '/file' + draftFilePath + '?mode=edit';
    const showPublishedButton = this.state.draftStatus == 'published';
    const showPublishButton = this.state.draftStatus == 'open' && filePermission == 'rw';
    const showEditButton = this.state.draftStatus == 'open' && filePermission == 'rw';
    const time = moment(draftInfo.mtime * 1000).format('YYYY-MM-DD HH:mm');
    const url = `${siteRoot}profile/${encodeURIComponent(draftInfo.last_modifier_email)}/`;
    return(
      <div className="wrapper">
        <div id="header" className="header review">
          <div className="cur-file-info">
            <div className="info-item file-feature">
              <span className="sf2-icon-review"></span>
            </div>
            <div>
              <div className="info-item file-info">
                <span className="file-name">{draftFileName}</span>
                <span className="mx-2 file-review">{gettext('Review')}</span>
              </div>
              {(!showPublishedButton && draftInfo.mtime) &&
                <div className="last-modification">
                  <a href={url}>{draftInfo.last_modifier_name}</a><span className="mx-1">{time}</span>
                </div>
              }
            </div>
          </div>
          <div className="button-group">
            {this.renderDiffButton()}
            {showEditButton &&
              <a href={draftLink} className="mx-1">
                <Button className="file-operation-btn" color="secondary">{gettext('Edit Draft')}</Button>
              </a>
            }
            {showPublishButton &&
              <button className='btn btn-success file-operation-btn' title={gettext('Publish draft')} onClick={this.onPublishDraft}>
                {gettext('Publish')}
              </button>
            }
            {showPublishedButton &&
              <button className='btn btn-success file-operation-btn' title={gettext('Published')} disabled>
                {gettext('Published')}
              </button>
            }
          </div>
        </div>
        <div id="main" className="main" ref="main">
          <div className="cur-view-container">
            <div className='cur-view-content' ref="viewContent">
              {this.state.isLoading ?
                <div className="markdown-viewer-render-content article">
                  <Loading />
                </div>
                :
                <div className="markdown-viewer-render-content article">
                  {this.renderContent()}
                </div>
              }
            </div>
            <div className="cur-view-right-part">
              <div className="review-side-panel">
                {this.renderNavItems()}
                <TabContent activeTab={this.state.activeTab}>
                  <TabPane tabId="reviewInfo">
                    <div className="review-side-panel-body">
                      <SidePanelReviewers
                        reviewers={reviewers}
                        toggleAddReviewerDialog={this.toggleAddReviewerDialog}/>
                      <SidePanelAuthor/>
                      {draftFileExists && <UnresolvedComments commentsList={this.state.commentsList}/>}
                      {(this.state.isShowDiff === true && this.state.changedNodes.length > 0) &&
                      <SidePanelChanges
                        changedNumber={this.state.changedNodes.length}
                        scrollToChangedNode={this.scrollToChangedNode}/>
                      }
                      <SidePanelOrigin originRepoName={originRepoName} draftInfo={draftInfo} draftStatus={draftStatus}/>
                    </div>
                  </TabPane>
                  <TabPane tabId="comments" className="comments">
                    <ReviewComments
                      scrollToQuote={this.scrollToQuote}
                      listComments={this.listComments}
                      commentsList={this.state.commentsList}
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
        </div>
        {this.state.showReviewerDialog &&
          <ModalPortal>
            <AddReviewerDialog
              showReviewerDialog={this.state.showReviewerDialog}
              toggleAddReviewerDialog={this.toggleAddReviewerDialog}
              draftID={draftID}
              reviewers={reviewers}
            />
          </ModalPortal>
        }
        {this.state.isShowCommentDialog &&
          <ModalPortal>
            <ReviewCommentDialog
              toggleCommentDialog={this.toggleCommentDialog}
              onCommentAdded={this.onCommentAdded}
              quote={this.quote}
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
    const { reviewers } = this.props;
    return (
      <div className="review-side-panel-item">
        <div className="review-side-panel-header">{gettext('Reviewers')}
          <i className="fa fa-cog" onClick={this.props.toggleAddReviewerDialog}></i>
        </div>
        {reviewers.length > 0 ?
          reviewers.map((item, index = 0, arr) => {
            return (
              <div className="reviewer-info" key={index}>
                <img className="avatar review-side-panel-avatar" src={item.avatar_url} alt=""/>
                <span className="reviewer-name ellipsis">{item.user_name}</span>
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
          <span className="author-name ellipsis">{author}</span>
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
    const { draftStatus, originRepoName } = this.props;
    const filePath = serviceURL + '/lib/' + draftRepoID + '/file' + draftOriginFilePath;
    return (
      <div className="dirent-table-container">
        <table className="table-thead-hidden">
          <thead>
            <tr><th width="25%"></th><th width="75%"></th></tr>
          </thead>
          <tbody>
            <tr>
              <th className="align-text-top">{gettext('Location')}</th>
              <td>
                {draftStatus === 'open' ?
                  <span>{originRepoName}{draftFilePath}</span> :
                  <a href={filePath} className="text-dark">{filePath}</a>
                }
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

const SidePanelOriginPropTypes = {
  originRepoName: PropTypes.string.isRequired,
  draftStatus: PropTypes.string.isRequired,
};

SidePanelOrigin.propTypes = SidePanelOriginPropTypes;


class UnresolvedComments extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { commentsList } = this.props;
    let unresolvedNumber = 0;
    if (commentsList) {
      for (let i = 0, count = commentsList.length; i < count; i++) {
        if (commentsList[i].resolved === false) {
          unresolvedNumber++;
        }
      }
    }
    return (
      <div className="review-side-panel-item">
        <div className="review-side-panel-header">{gettext('Comments')}</div>
        <div className="changes-info">
          <span>{gettext('Unresolved comments:')}{' '}{unresolvedNumber}</span>
        </div>
      </div>
    );
  }
}

const UnresolvedCommentsPropTypes = {
  commentsList: PropTypes.array.isRequired,
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
          {this.props.changedNumber > 0 &&
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


ReactDom.render(<Draft />, document.getElementById('wrapper'));
