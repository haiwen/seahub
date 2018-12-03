import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
/* eslint-disable */
import Prism from 'prismjs';
/* eslint-enable */
import { siteRoot, gettext, reviewID, draftOriginFilePath, draftFilePath, draftOriginRepoID,
  draftFileName, opStatus, publishFileVersion, originFileVersion, author, authorAvatar
} from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import axios from 'axios';
import DiffViewer from '@seafile/seafile-editor/dist/viewer/diff-viewer';
import { htmlSerializer } from '@seafile/seafile-editor/dist/utils/serialize-html';
import { serialize } from '@seafile/seafile-editor/dist/utils/slate2markdown/serialize';
import Loading from './components/loading';
import Toast from './components/toast';
import ReviewComments from './components/review-list-view/review-comments';
import ReviewCommentDialog from './components/review-list-view/review-comment-dialog.js';
import { Tooltip } from 'reactstrap';
import AddReviewerDialog from './components/dialog/add-reviewer-dialog.js';
import { findRange } from '@seafile/slate-react';
import { Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import classnames from 'classnames';
import HistoryList from './pages/review/history-list';
import Plain from 'slate-plain-serializer';
import { Document, Block, Value } from 'slate';

import 'seafile-ui';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/layout.css';
import './css/initial-style.css';
import './css/toolbar.css';
import './css/draft-review.css';

require('@seafile/seafile-editor/dist/editor/code-hight-package');

class DraftReview extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      draftContent: '',
      draftOriginContent: '',
      reviewStatus: opStatus,
      isLoading: true,
      commentsNumber: null,
      inResizing: false,
      commentWidth: 30,
      isShowDiff: true,
      showDiffTip: false,
      showReviewerDialog: false,
      reviewers: [],
      activeTab: 'reviewInfo',
      historyList: [],
      totalReversionCount: 0,
      changedNodes: [],
      isShowCommentDialog: false,
      commentBtnTop: '-1000px',
    };
    this.selectedText = '';
    this.newIndex = null;
    this.oldIndex = null;
    this.changeIndex = -1;
  }

  componentDidMount() {
    this.initialContent();
    document.addEventListener('selectionchange', this.setBtnPosition);
    let that = this;
    setTimeout(() => {
      that.getChangedNodes();
    }, 1000);
  }

  initialContent = () => {
    if (publishFileVersion == 'None') {
      axios.all([
        seafileAPI.getFileDownloadLink(draftOriginRepoID, draftFilePath),
        seafileAPI.getFileDownloadLink(draftOriginRepoID, draftOriginFilePath)
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
    } else {
      let dl0 = siteRoot + 'repo/' + draftOriginRepoID + '/' + publishFileVersion + '/download?' + 'p=' + draftOriginFilePath; 
      let dl = siteRoot + 'repo/' + draftOriginRepoID + '/' + originFileVersion + '/download?' + 'p=' + draftOriginFilePath; 
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
    }
  }

  componentWillUnmount() {
    document.removeEventListener('selectionchange', this.setBtnPosition);
  }

  onCloseReview = () => {
    seafileAPI.updateReviewStatus(reviewID, 'closed').then(res => {
      this.setState({reviewStatus: 'closed'});
      let msg_s = gettext('Successfully closed review %(reviewID)s.');
      msg_s = msg_s.replace('%(reviewID)s', reviewID);
      Toast.success(msg_s);
    }).catch(() => {
      let msg_s = gettext('Failed to close review %(reviewID)s');
      msg_s = msg_s.replace('%(reviewID)s', reviewID);
      Toast.error(msg_s);
    });
  }

  onPublishReview = () => {
    seafileAPI.updateReviewStatus(reviewID, 'finished').then(res => {
      this.setState({reviewStatus: 'finished', activeTab: 'reviewInfo' });
      let msg_s = gettext('Successfully published draft.');
      Toast.success(msg_s);
    }).catch(() => {
      let msg_s = gettext('Failed to publish draft.');
      Toast.error(msg_s);
    });
  }
  
  toggleCommentDialog = () => {
    this.setState({
      isShowCommentDialog: !this.state.isShowCommentDialog
    });
  }

  getCommentsNumber = () => {
    seafileAPI.listReviewComments(reviewID).then((res) => {
      let number = res.data.total_count;
      this.setState({
        commentsNumber: number,
      });
    });
  }

  onResizeMouseUp = () => {
    if(this.state.inResizing) {
      this.setState({
        inResizing: false
      });
    }
  }

  onResizeMouseDown = () => {
    this.setState({
      inResizing: true
    });
  };

  onResizeMouseMove = (e) => {
    let rate = 100 - e.nativeEvent.clientX / this.refs.main.clientWidth * 100;
    if(rate < 20 || rate > 60) {
      this.setState({
        inResizing: false
      });
      return null;
    }
    this.setState({
      commentWidth: rate
    });
  };

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

  listReviewers = () => {
    seafileAPI.listReviewers(reviewID).then((res) => {
      this.setState({
        reviewers: res.data.reviewers
      });
    });
  }

  setBtnPosition = (e) => {
    const nativeSelection = window.getSelection();
    if (!nativeSelection.rangeCount) {
      return;
    }
    if (nativeSelection.isCollapsed === false) {
      const nativeRange = nativeSelection.getRangeAt(0);
      let range = findRange(nativeRange, this.refs.diffViewer.value);
      if (!range) {
        return;
      }
      let rect = nativeRange.getBoundingClientRect();
      // fix Safari bug
      if (navigator.userAgent.indexOf('Chrome') < 0 && navigator.userAgent.indexOf('Safari') > 0) {
        if (nativeRange.collapsed && rect.top == 0 && rect.height == 0) {
          if (nativeRange.startOffset == 0) {
            nativeRange.setEnd(nativeRange.endContainer, 1);
          } else {
            nativeRange.setStart(nativeRange.startContainer, nativeRange.startOffset - 1);
          }
          rect = nativeRange.getBoundingClientRect();
          if (rect.top == 0 && rect.height == 0) {
            if (nativeRange.getClientRects().length) {
              rect = nativeRange.getClientRects()[0];
            }
          }
        }
      }
      let style = this.refs.commentbtn.style;
      let commentBtnTop = `${rect.top - 100 + this.refs.viewContent.scrollTop}px`;
      style.top = commentBtnTop;
      this.setState({
        commentBtnTop: commentBtnTop
      });
      return range;
    }
    else {
      let style = this.refs.commentbtn.style;
      style.top = '-1000px';
    }
  }

  getSelectedText = () => {
    const value = this.refs.diffViewer.value;
    const native = window.getSelection();
    const { fragment } = value;
    const nativeRange = native.getRangeAt(0);
    let contents = nativeRange.cloneContents();
    const div = window.document.createElement('div');
    div.appendChild(contents);
    div.setAttribute('contenteditable', true);
    let fragmentDOM = htmlSerializer.deserialize(div.innerHTML).document;
    let nodes = [];
    for (let i = 0; i < fragmentDOM.nodes.toArray().length; i++) {
      let node = Block.create({
        data: fragmentDOM.nodes.toArray()[i].data,
        key: fragmentDOM.nodes.toArray()[i].key,
        nodes: fragmentDOM.nodes.toArray()[i].nodes,
        type: 'blockquote'
      });
      nodes[i] = node;
    }
    let newDocument = Document.create({
      nodes: nodes
    });
    let newValue = Value.create({
      document: newDocument
    });
    this.selectedText = serialize(newValue);
  }

  getIndexs = () => {
    let range = this.setBtnPosition();
    if (!range) {
      return;
    }
    const { document } = this.refs.diffViewer.value;
    let { anchor, focus } = range;
    const anchorText = document.getNode(anchor.key);
    const focusText = document.getNode(focus.key);
    const anchorInline = document.getClosestInline(anchor.key);
    const focusInline = document.getClosestInline(focus.key);
    const focusBlock = document.getClosestBlock(focus.key);
    const anchorBlock = document.getClosestBlock(anchor.key);
    if (anchorBlock && anchor.offset == 0 && focusBlock && focus.offset != 0) {
      range = range.setFocus(focus.setOffset(0));
    }
    // COMPAT: If the selection is at the end of a non-void inline node, and
    // there is a node after it, put it in the node after instead. This
    // standardizes the behavior, since it's indistinguishable to the user.
    if (anchorInline && anchor.offset == anchorText.text.length) {
      const block = document.getClosestBlock(anchor.key);
      const nextText = block.getNextText(anchor.key);
      if (nextText) {
        range = range.moveAnchorTo(nextText.key, 0);
      }
    }
    if (focusInline && focus.offset == focusText.text.length) {
      const block = document.getClosestBlock(focus.key);
      const nextText = block.getNextText(focus.key);
      if (nextText) {
        range = range.moveFocusTo(nextText.key, 0); 
      }
    }
    let blockPath = document.createSelection(range).anchor.path.slice(0, 1);
    let node = document.getNode(blockPath);
    this.newIndex = node.data.get('new_index');
    this.oldIndex = node.data.get('old_index');
  }

  addComment = (e) => {
    e.stopPropagation();
    this.getSelectedText();
    this.getIndexs();
    this.setState({
      isShowCommentDialog: true
    });
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

  scrollToQuote = (newIndex, oldIndex, selectedText) => {
    const nodes = this.refs.diffViewer.value.document.nodes;
    let key;
    nodes.map((node) => {
      if (node.data.get('old_index') == oldIndex && node.data.get('new_index') == newIndex) {
        key = node.key;
      }
    });
    if (typeof(key) !== 'string') {
      nodes.map((node) => {
        if (node.text.indexOf(selectedText) > 0) {
          key = node.key;
        }
      });
    }
    if (typeof(key) === 'string') {
      const win = window;
      const element = win.document.querySelector(`[data-key="${key}"]`);
      const scroller = this.findScrollContainer(element, win);
      const isWindow = scroller == win.document.body || scroller == win.document.documentElement;
      if (isWindow) {
        win.scrollTo(0, element.offsetTop);
      } else {
        scroller.scrollTop = element.offsetTop;
      }
    }
  }

  tabItemClick = (tab) => {
    if (this.state.activeTab !== tab) {
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

  getChangedNodes = () => {
    const nodes = this.refs.diffViewer.value.document.nodes;
    let keys = [];
    let lastDiffState = '';
    nodes.map((node) => {
      if (node.data.get('diff_state') === 'diff-added' && lastDiffState !== 'diff-added') {
        keys.push(node.key);
      }
      else if (node.data.get('diff_state') === 'diff-removed' && lastDiffState !== 'diff-removed') {
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
    if (scroll === 'up') {
      this.changeIndex++;
    }
    else {
      this.changeIndex--;
    }
    if (this.changeIndex > this.state.changedNodes.length - 1) {
      this.changeIndex = 0;
    }
    if (this.changeIndex < 0) {
      this.changeIndex = this.state.changedNodes.length - 1;
    }
    const win = window;
    let key = this.state.changedNodes[this.changeIndex];
    const element = win.document.querySelector(`[data-key="${key}"]`);
    const scroller = this.findScrollContainer(element, win);
    const isWindow = scroller == win.document.body || scroller == win.document.documentElement;
    if (isWindow) {
      win.scrollTo(0, element.offsetTop);
    } else {
      scroller.scrollTop = element.offsetTop;
    }
  }

  componentWillMount() {
    this.getCommentsNumber();
    this.listReviewers();
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

  setDiffViewerContent = (newContent, prevContent) => {
    this.setState({
      draftContent: newContent,
      draftOriginContent: prevContent  
    });
  }

  onCommentAdded = () => {
    this.getCommentsNumber();
    this.toggleCommentDialog();
  }

  render() {
    const onResizeMove = this.state.inResizing ? this.onResizeMouseMove : null;
    const draftLink = siteRoot + 'lib/' + draftOriginRepoID + '/file' + draftFilePath + '?mode=edit';
    const OriginFileLink = siteRoot + 'lib/' + draftOriginRepoID + '/file' + draftOriginFilePath + '/';
    return(
      <div className="wrapper">
        <div id="header" className="header review">
          <div className="cur-file-info">
            <div className="info-item file-feature">
              <span className="fas fa-code-merge"></span>
            </div>
            <div className="info-item file-info">
              <React.Fragment>
                <span className="file-name">{draftFileName}</span>
                <span className="file-copywriting">{gettext('review')}</span>
                { opStatus == 'open' && <a href={draftLink} className="draft-link">{gettext('Edit draft')}</a>}
                { opStatus !== 'open' && <a href={OriginFileLink} className="view-file-link">{gettext('View File')}</a>} 
              </React.Fragment>
            </div>
          </div>
          <div className="button-group">
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
            {
              this.state.reviewStatus === 'open' &&
              <div className="cur-file-operation">
                <button className='btn btn-secondary file-operation-btn' title={gettext('Close review')}
                  onClick={this.onCloseReview}>{gettext('Close')}</button>
                <button className='btn btn-success file-operation-btn' title={gettext('Publish draft')}
                  onClick={this.onPublishReview}>{gettext('Publish')}</button>
              </div>
            }
            {
              this.state.reviewStatus === 'finished' &&
              <div className="review-state review-state-finished">{gettext('Finished')}</div>
            }
            {
              this.state.reviewStatus === 'closed' && 
              <div className="review-state review-state-closed">{gettext('Closed')}</div>
            }
          </div>
        </div>
        <div id="main" className="main" ref="main">
          <div className="cur-view-container content-container"
            onMouseMove={onResizeMove} onMouseUp={this.onResizeMouseUp} ref="comment">
            <div style={{width:(100-this.state.commentWidth)+'%'}}
              className='cur-view-content' ref="viewContent">
              {this.state.isLoading ?
                <div className="markdown-viewer-render-content article">
                  <Loading /> 
                </div> 
                :
                <div className="markdown-viewer-render-content article" ref="mainPanel">
                  {this.state.isShowDiff ? 
                    <DiffViewer
                      newMarkdownContent={this.state.draftContent}
                      oldMarkdownContent={this.state.draftOriginContent}
                      ref="diffViewer"
                    />
                    : 
                    <DiffViewer
                      newMarkdownContent={this.state.draftContent}
                      oldMarkdownContent={this.state.draftContent}
                      ref="diffViewer"
                    />
                  }
                  <i className="fa fa-plus-square review-comment-btn" ref="commentbtn" onMouseDown={this.addComment}></i>
                  {this.state.isShowCommentDialog &&
                    <ReviewCommentDialog
                      toggleCommentDialog={this.toggleCommentDialog}
                      onCommentAdded={this.onCommentAdded}
                      selectedText={this.selectedText}
                      newIndex={this.newIndex}
                      oldIndex={this.oldIndex}
                      top={this.state.commentBtnTop}
                    />
                  }
                </div>
              }
            </div>
            <div className="cur-view-right-part" style={{width:(this.state.commentWidth)+'%'}}>
              <div className="seafile-comment-resize" onMouseDown={this.onResizeMouseDown}></div>
              <div className="review-side-panel">
                <Nav tabs className="review-side-panel-nav">
                  <NavItem className="nav-item">
                    <NavLink
                      className={classnames({ active: this.state.activeTab === 'reviewInfo' })}
                      onClick={() => { this.tabItemClick('reviewInfo');}}
                    >
                      <i className="fas fa-info-circle"></i>
                    </NavLink>
                  </NavItem>
                  <NavItem className="nav-item">
                    <NavLink
                      className={classnames({ active: this.state.activeTab === 'comments' })}
                      onClick={() => { this.tabItemClick('comments');}}
                    >
                      <i className="fa fa-comments"></i>
                      { this.state.commentsNumber > 0 &&
                        <div className='comments-number'>{this.state.commentsNumber}</div>}
                    </NavLink>
                  </NavItem>
                  { this.state.reviewStatus == 'finished' ? '':
                    <NavItem className="nav-item">
                      <NavLink
                        className={classnames({ active: this.state.activeTab === 'history' })}
                        onClick={() => { this.tabItemClick('history');}}
                      >
                        <i className="fas fa-history"></i>
                      </NavLink>
                    </NavItem>
                  }
                </Nav>
                <TabContent activeTab={this.state.activeTab}>
                  <TabPane tabId="reviewInfo">
                    <div className="review-side-panel-body">
                      <SidePanelReviewers
                        reviewers={this.state.reviewers}
                        toggleAddReviewerDialog={this.toggleAddReviewerDialog}/>                        
                      <SidePanelAuthor/>
                      { this.state.isShowDiff &&
                      <SidePanelChanges
                        changedNumber={this.state.changedNodes.length}
                        scrollToChangedNode={this.scrollToChangedNode}/>
                      }
                    </div>
                  </TabPane>
                  <TabPane tabId="comments" className="comments">
                    <ReviewComments
                      scrollToQuote={this.scrollToQuote}
                      getCommentsNumber={this.getCommentsNumber}
                      commentsNumber={this.state.commentsNumber}
                      inResizing={this.state.inResizing}
                    />
                  </TabPane>
                  { this.state.reviewStatus == 'finished'? '':
                    <TabPane tabId="history" className="history">
                      <HistoryList setDiffViewerContent={this.setDiffViewerContent} 
                        historyList={this.state.historyList}
                        totalReversionCount={this.state.totalReversionCount}/>
                    </TabPane>
                  }
                </TabContent>
              </div>
            </div>
          </div>
        </div>
        { this.state.showReviewerDialog &&
          <AddReviewerDialog
            showReviewerDialog={this.state.showReviewerDialog}
            toggleAddReviewerDialog={this.toggleAddReviewerDialog}
            reviewID={reviewID}
            reviewers={this.state.reviewers}
          />
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

class SidePanelChanges extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="review-side-panel-item">
        <div className="review-side-panel-header">{gettext('Changes')}</div>
        <div className="changes-info">
          <span>{gettext(`Number of changes: ${this.props.changedNumber}`)}</span>
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
  <DraftReview />,
  document.getElementById('wrapper')
);
