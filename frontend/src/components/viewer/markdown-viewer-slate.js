import React, { Fragment } from 'react';
import { IconButton, ButtonGroup, CollabUsersButton } from '@seafile/seafile-editor/dist/components/topbarcomponent/editorToolBar';
import { Value, Document, Block } from 'slate';
import HistoryList from '@seafile/seafile-editor/dist/components/history-list';
import FileInfo from '@seafile/seafile-editor/dist/components/topbarcomponent/file-info';
import RelatedFilesList from '@seafile/seafile-editor/dist/components/related-files-list';
import Loading from '@seafile/seafile-editor/dist/components/loading';
import DiffViewer from '@seafile/seafile-editor/dist/viewer/diff-viewer';
import { Editor, findRange } from '@seafile/slate-react';
import { serialize, deserialize } from '@seafile/seafile-editor/dist/utils/slate2markdown/index.js';
import { renderNode, renderMark } from '@seafile/seafile-editor/dist/utils/render-slate.js';
import { translate } from 'react-i18next';
import OutlineView from '@seafile/seafile-editor/dist/components/outline.js';
import { decorationNode } from '@seafile/seafile-editor/dist/editor/plugin-utils';
import CommentsList from '@seafile/seafile-editor/dist/components/comments-list';
import CommentDialog from '@seafile/seafile-editor/dist/components/comment-dialog';

const URL = require('url-parse');

require('@seafile/seafile-editor/dist/editor/code-hight-package');
require('@seafile/seafile-editor/dist/css/markdown-viewer.css');
require('@seafile/seafile-editor/dist/css/markdown-viewer-slate/file-tags-list.css');

class ViewerSidePanel extends React.PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="seafile-md-viewer-side-panel">
        <div className="seafile-md-viewer-side-panel-heading">Contents</div>
        <div className="seafile-md-viewer-side-panel-content">
          <OutlineView isViewer={true} document={this.props.value.document}/>
        </div>
      </div>
    );
  }
}

class MarkdownViewerContent extends React.PureComponent {

  constructor(props) {
    super(props);
  }

  decorateNode(node) {
    return decorationNode(node);
  }

  setBtnPosition = (e) => {
    const nativeSelection = window.getSelection();
    if (!nativeSelection.rangeCount) {
      this.range = null;
      return;
    }
    if (nativeSelection.isCollapsed === false) {
      const nativeRange = nativeSelection.getRangeAt(0);
      const focusNode = nativeSelection.focusNode;
      if ((focusNode.tagName === 'I') ||
          (focusNode.nodeType !== 3 && focusNode.getAttribute('class') === 'language-type')) {
        // fix select last paragraph
        let fragment = nativeRange.cloneContents();
        let startNode = fragment.firstChild.firstChild;
        if (!startNode) return;
        let newNativeRange = document.createRange();
        newNativeRange.setStartBefore(startNode);
        newNativeRange.setEndAfter(startNode);
        this.range =  findRange(newNativeRange, this.editor.value);
      }
      else {
        this.range = findRange(nativeRange, this.editor.value);
      }
      if (!this.range) return;
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
      style.top = this.props.isShowComments ?
        `${rect.top - 63 + this.refs.mainPanel.scrollTop}px` :
        `${rect.top - 63 + this.props.getScrollTop()}px`;
      style.right = '0px';
    }
    else {
      let style = this.refs.commentbtn.style;
      style.top = '-1000px';
    }
  }

  addComment = (e) => {
    e.stopPropagation();
    this.getQuote();
    this.props.toggleCommentDialog();
  }

  getQuote = () => {
    let range = this.range;
    if (!range) return;
    const { document } = this.editor.value;
    let { anchor, focus } = range;
    const anchorText = document.getNode(anchor.key);
    const focusText = document.getNode(focus.key);
    const anchorInline = document.getClosestInline(anchor.key);
    const focusInline = document.getClosestInline(focus.key);
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
    let fragment = document.getFragmentAtRange(range);
    let nodes = this.removeNullNode(fragment.nodes);
    let newFragment = Document.create({
      nodes: nodes
    });
    let newValue = Value.create({
      document: newFragment
    });
    this.props.setQuote(serialize(newValue.toJSON()));
    let selection = document.createSelection(range);
    selection = selection.setIsFocused(true);
    this.props.addCommentPosition(selection.anchor.path);
  }

  removeNullNode = (oldNodes) => {
    let newNodes = [];
    oldNodes.map((node) => {
      const text = node.text.trim();
      const childNodes = node.nodes;
      if (!text) return;
      if ((childNodes && childNodes.size === 1) || (!childNodes)) {
        newNodes.push(node);
      }
      else if (childNodes.size > 1) {
        let nodes = this.removeNullNode(childNodes);
        let newNode = Block.create({
          nodes: nodes,
          data: node.data,
          key: node.key,
          type: node.type
        });
        newNodes.push(newNode);
      }
    });
    return newNodes;
  }

  componentDidMount() {
    document.addEventListener('selectionchange', this.setBtnPosition);
    setTimeout(() => {
      let url = new URL(window.location.href);
      if (url.hash) {
        window.location.href = window.location.href;
      }
    }, 100);
  }

  componentWillUnmount() {
    document.removeEventListener('selectionchange', this.setBtnPosition);
  }

  render() {
    const relatedFiles = this.props.relatedFiles;
    return (
      <div className={!this.props.isShowComments ? 'seafile-md-viewer-main-panel' :
        'seafile-md-viewer-main-panel seafile-md-viewer-main-panel-commenton'} ref="mainPanel">
        <div className='seafile-md-viewer-rendered-content'>
          <Editor
            readOnly
            className='article'
            value={this.props.value}
            renderNode={renderNode}
            renderMark={renderMark}
            decorateNode={this.decorateNode}
            ref={(editor) => this.editor = editor}
          />
          {(relatedFiles && relatedFiles.length > 0) &&
            <RelatedFilesList
              relatedFiles={relatedFiles}
              editorUtilities={this.props.editorUtilities}
              siteRoot={this.props.siteRoot}
              t={this.props.t}
            />
          }
        </div>
        <i className="fa fa-comments seafile-viewer-comment-btn" ref="commentbtn" onMouseDown={this.addComment}></i>
      </div>
    );
  }
}

class MarkdownViewerSlate extends React.PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      isShowHistory: false,
      isShowComments: false,
      loadingDiff: true,
      markdownContent: '',
      markdownContent1: '',
      commentsNumber: null,
      value: null,
      showTip: false,
      commentPosition: null,
      isShowCommentDialog: false,
      collabUsers: this.props.userInfo ?
          [{user: this.props.userInfo, is_editing: false}] : [],
    };
  }

  switchToEditor = () => {
    this.props.setEditorMode('rich');
    this.props.emitSwitchEditor(false);
  }

  toggleHistory = () => {
    this.setState({
      isShowHistory: !this.state.isShowHistory
    });
  }

  toggleShareLinkDialog = () => {
    this.props.openDialogs && this.props.openDialogs('share_link');
  }

  toggleNewDraft = () => {
    this.props.editorUtilities.createDraftFile();
  }

  backToParentDirectory = () => {
    window.location.href = this.props.editorUtilities.getParentDectionaryUrl();
  }

  reloadDiffContent = () =>{
    this.setState({
      loadingDiff: true,
    });
  }

  showDiffViewer = () => {
    this.setState({
      loadingDiff: false,
    });
  }

  setDiffViewerContent = (markDownContent1, markDownContent2) => {
    this.setState({
      markdownContent: markDownContent1,
      markdownContent1: markDownContent2
    });
  }

  toggleCommentList = () => {
    if (this.state.isShowHistory) {
      this.setState({
        isShowHistory: false,
        isShowComments: true
      });
    }
    else {
      this.setState({
        isShowComments: !this.state.isShowComments
      });
    }
  }

  openCommentList = () => {
    if (!this.state.isShowComments) {
      this.setState({
        isShowComments: true
      });
    }
  }

  getCommentsNumber = () => {
    this.props.editorUtilities.getCommentsNumber().then((res) => {
      let commentsNumber = res.data[Object.getOwnPropertyNames(res.data)[0]];
      this.setState({
        commentsNumber: commentsNumber
      });
    });
  }

  onEdit = (event) => {
      console.log('on edit');
    event.preventDefault();
    this.switchToEditor();
  }

  scrollToNode = (node) => {
    let url = new URL(window.location.href);
    url.set('hash', 'user-content-' + node.text);
    window.location.href = url.toString();
  }

  componentWillMount() {
    this.getCommentsNumber();
    let value = deserialize(this.props.markdownContent);
    this.setState({
      value: value,
    });
  }

  renderToolbar() {
    return (
      <React.Fragment>
        <div className="topbar-btn-container">
          { (!this.props.hasDraft && !this.props.isDraft) &&
            <button onMouseDown={this.toggleNewDraft}
             className="btn btn-success btn-new-draft">
              {this.props.t('new_draft')}</button>
          }
          { this.state.collabUsers.length > 0 &&
            <CollabUsersButton className={'collab-users-dropdown'} users={this.state.collabUsers} id={'usersButton'} />
            }
          <ButtonGroup>
            <IconButton id={'shareBtn'} text={this.props.t('share')} icon={'fa fa-share-alt'}
              onMouseDown={this.toggleShareLinkDialog}/>
            {
              this.state.commentsNumber > 0 ?
                <button className="btn btn-icon btn-secondary btn-active"
                  id="commentsNumber" type="button" data-active="false"
                  onMouseDown={this.toggleCommentList}>
                  <i className="fa fa-comments"></i>
                  <span>&nbsp;{this.state.commentsNumber}</span>
                </button>
                :
                <IconButton id={'commentsNumber'} text={this.props.t('comment')}
                  icon={'fa fa-comments'} onMouseDown={this.toggleCommentList}/>
            }
            <IconButton text={this.props.t('back_to_parent_directory')}
              id={'parentDirectory'} icon={'fa fa-folder-open'}
              onMouseDown={this.backToParentDirectory}/>
            {
              (!this.props.hasDraft && this.props.fileInfo.permission === 'rw')? <IconButton text={this.props.t('edit')}
                id={'editButton'} icon={'fa fa-edit'} onMouseDown={this.onEdit}/>: null
            }
            {
              (this.props.showFileHistory) && (!this.state.isShowHistory && <IconButton id={'historyButton'}
                text={this.props.t('file_history')} onMouseDown={this.toggleHistory} icon={'fa fa-history'}/>)
            }
          </ButtonGroup>
          {/*<ViewerMoreMenu text={this.props.t('more')} id={'moreButton'} toggleDiff={this.toggleDiff}/>*/}
        </div>
      </React.Fragment>
    );
  }

  toggleTip = () => {
    this.setState({
      showTip: !this.state.showTip
    });
  }

  addCommentPosition = (position) => {
    this.setState({
      commentPosition: position
    });
  }

  getScrollTop = () => {
    return this.refs.markdownViewer.scrollTop;
  }

  findScrollContainer = (el, window) => {
    let parent = el.parentNode;
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

  scrollToQuote = (path) => {
    if (!path) return;
    const win = window;
    if (path.length > 2) {
      // deal with code block or chart
      path[0] = path[0] > 1 ? path[0] - 1 : path[0] + 1;
      path = path.slice(0, 1);
    }
    let node = this.state.value.document.getNode(path);
    if (!node) {
      path = path.slice(0, 1);
      node = this.state.value.document.getNode(path);
    }
    if (node) {
      let element = win.document.querySelector(`[data-key="${node.key}"]`);
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

  setQuote = (quote) => {
    this.quote = quote;
  }

  toggleCommentDialog = () => {
    this.setState({
      isShowCommentDialog: !this.state.isShowCommentDialog
    });
  }

  onCommentAdded = () => {
    this.getCommentsNumber();
    this.toggleCommentDialog();
  }

  render() {
    console.log('render viewer');
    const { relatedFiles, fileTagList } = this.props;
    const openDialogs = this.props.openDialogs;
    let relatedFileString = '';
    if (relatedFiles) {
      const length = relatedFiles.length;
      if (length === 1) {
        relatedFileString = 'related_file';
      }
      else if (length > 1) {
        relatedFileString = 'related_files';
      }
    }
    return (
      <div className="seafile-md-viewer d-flex flex-column">
        <div className="sf-md-viewer-topbar">
          <div className="sf-md-viewer-topbar-first d-flex justify-content-between">
            <FileInfo
              toggleStar={this.props.toggleStar}
              editorUtilities={this.props.editorUtilities}
              fileInfo={this.props.fileInfo}/>
            {(this.props.hasDraft && !this.props.isDraft) &&
              <div className='seafile-btn-view-review'>
                <div className='tag tag-green'>
                  {this.props.t('this_file_is_in_draft_stage')}
                  <a className="ml-2" onMouseDown={this.props.editorUtilities.goDraftPage}>{this.props.t('edit_draft')}</a></div>
              </div>
            }
            {this.renderToolbar()}
          </div>
          <div className="sf-md-viewer-topbar-second d-flex justify-content-center">
            {(fileTagList) && (fileTagList.length > 0 ?
              <ul className="sf-files-tags">
                {fileTagList.map((item, index=0) => {
                  return (
                    <li key={index} className='sf-files-tag'>
                      <span className="file-tag-icon" style={{backgroundColor: item.tag_color}}></span>
                      <span className="file-tag-name" title={item.tag_name}>{item.tag_name}</span>
                    </li>
                  );
                })
                }
                <li className='sf-files-tag'>
                  <span className="file-tag-name" onClick={openDialogs.bind(this, 'tags')}>{this.props.t('edit')}</span>
                </li>
              </ul>
              :
              <span className="no-file-tag edit-related-file" onClick={openDialogs.bind(this, 'tags')}>{this.props.t('no_tags')}</span>
            )}
            {relatedFiles &&
              <div className="sf-related-files-bar">
                {relatedFiles.length === 0 ?
                  <span className="edit-related-file no-related-file" onClick={openDialogs.bind(this, 'related_files')}>{this.props.t('no_related_files')}</span>:
                  <React.Fragment>
                    <a href="#sf-releted-files">{relatedFiles.length}{' '}{this.props.t(relatedFileString)}</a>
                    <span className="edit-related-file" onClick={openDialogs.bind(this, 'related_files')}>{this.props.t('edit')}</span>
                  </React.Fragment>
                }
              </div>
            }
          </div>
        </div>
        <div className="seafile-md-viewer-main d-flex" ref="markdownViewer">
          { this.state.isShowHistory ?
            <Fragment>
              <div className={'diff-container'}>
                <div className={'diff-wrapper article'}>
                  { this.state.loadingDiff ?
                    <Loading/> :
                    <DiffViewer newMarkdownContent={this.state.markdownContent}
                      oldMarkdownContent={this.state.markdownContent1}/>
                  }
                </div>
              </div>
              <HistoryList
                toggleHistory={this.toggleHistory}
                showDiffViewer={this.showDiffViewer}
                reloadDiffContent={this.reloadDiffContent}
                setDiffViewerContent={this.setDiffViewerContent}
                editorUtilities={this.props.editorUtilities}
                text={this.props.t('history_version')}
              />
            </Fragment> :
            <Fragment>
              <MarkdownViewerContent
                isShowComments={this.state.isShowComments}
                value={this.state.value}
                openCommentList={this.openCommentList}
                getScrollTop={this.getScrollTop}
                addCommentPosition={this.addCommentPosition}
                relatedFiles={this.props.relatedFiles}
                editorUtilities={this.props.editorUtilities}
                t={this.props.t}
                siteRoot={this.props.siteRoot}
                toggleCommentDialog={this.toggleCommentDialog}
                ref="markdownViewer"
                setQuote={this.setQuote}
              />
              <ViewerSidePanel
                viewer={this} value={this.state.value}/>
              {
                this.state.isShowComments &&
                <CommentsList
                  editorUtilities={this.props.editorUtilities}
                  toggleCommentList={this.toggleCommentList}
                  commentsNumber={this.state.commentsNumber}
                  getCommentsNumber={this.getCommentsNumber}
                  commentPosition={this.state.commentPosition}
                  scrollToQuote={this.scrollToQuote}
                />
              }
            </Fragment>
          }
        </div>
        {this.state.isShowCommentDialog &&
          <CommentDialog
            toggleCommentDialog={this.toggleCommentDialog}
            editorUtilities={this.props.editorUtilities}
            onCommentAdded={this.onCommentAdded}
            commentPosition={this.state.commentPosition}
            quote={this.quote}
            t={this.props.t}
          />
        }
      </div>
    );
  }
}

export default translate('translations') (MarkdownViewerSlate);
