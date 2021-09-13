import React, { Fragment } from 'react';
import { SeafileEditor } from '@seafile/seafile-editor/dist/editor/editor.js';
import 'whatwg-fetch';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import { gettext, isDocs, mediaUrl } from './utils/constants';
import io from 'socket.io-client';
import toaster from './components/toast';
import ModalPortal from './components/modal-portal';
import ShareDialog from './components/dialog/share-dialog';
import InsertFileDialog from './components/dialog/insert-file-dialog';
import InsertRepoImageDialog from './components/dialog/insert-repo-image-dialog';
import FileParticipantDialog from './components/dialog/file-participant-dialog';
import { serialize, deserialize } from '@seafile/seafile-editor/dist/utils/slate2markdown';
import LocalDraftDialog from './components/dialog/local-draft-dialog';
import MarkdownViewerToolbar from './components/toolbar/markdown-viewer-toolbar';
import EditFileTagDialog from './components/dialog/edit-filetag-dialog';
import RelatedFileDialogs from './components/dialog/related-file-dialogs';

import './css/markdown-viewer/markdown-editor.css';

const CryptoJS = require('crypto-js');
const URL = require('url-parse');
const { repoID, repoName, filePath, fileName, mode, draftID, isDraft, hasDraft, isLocked, lockedByMe } = window.app.pageOptions;
const { siteRoot, serviceUrl, seafileCollabServer } = window.app.config;
const userInfo = window.app.userInfo;
const userName = userInfo.username;
let dirPath = Utils.getDirName(filePath);
const IMAGE_SUFFIXES = ['png', 'PNG', 'jpg', 'JPG', 'gif', 'GIF'];

function getImageFileNameWithTimestamp() {
  var d = Date.now();
  return 'image-' + d.toString() + '.png';
}


class EditorApi {

  constructor () {
    this.repoID = repoID;
    this.filePath = filePath;
    this.serviceUrl = serviceUrl;
    this.name = userInfo.name;
    this.contact_email = userInfo.contact_email;
    this.fileName = fileName;
    this.userName = userName;
  }

  saveContent(content) {
    return (
      seafileAPI.getUpdateLink(repoID, dirPath).then((res) => {
        const uploadLink = res.data;
        return seafileAPI.updateFile(uploadLink, filePath, fileName, content);
      })
    );
  }

  unstarItem () {
    return (
      seafileAPI.unstarItem(this.repoID, this.filePath)
    );
  }

  starItem() {
    return (
      seafileAPI.starItem(this.repoID, this.filePath)
    );
  }

  getParentDectionaryUrl() {
    let parentPath = this.filePath.substring(0, this.filePath.lastIndexOf('/'));
    let libName = encodeURIComponent(repoName);
    let path = Utils.encodePath(parentPath);
    return this.serviceUrl + '/library/' + this.repoID + '/' + libName + path;
  }

  _getImageURL(fileName) {
    const url = this.serviceUrl + '/lib/' + repoID + '/file/images/auto-upload/' + fileName + '?raw=1';
    return url;
  }
  
  uploadLocalImage = (imageFile) => {
    return (
      seafileAPI.getFileServerUploadLink(repoID, '/').then((res) => {
        const uploadLink = res.data + '?ret-json=1';
        const name = getImageFileNameWithTimestamp();
        const newFile = new File([imageFile], name, {type: imageFile.type});
        const formData = new FormData();
        formData.append('parent_dir', '/');
        formData.append('relative_path', 'images/auto-upload');
        formData.append('file', newFile);
        return seafileAPI.uploadImage(uploadLink, formData);
      }).then ((res) => {
        return this._getImageURL(res.data[0].name);
      })
    );
  }

  getFileURL(fileNode) {
    var url;
    if (fileNode.type === 'file') {
      if (fileNode.isImage()) {
        url = serviceUrl + '/lib/' + repoID + '/file' + Utils.encodePath(fileNode.path()) + '?raw=1';
      } else {
        url = serviceUrl + '/lib/' + repoID + '/file' + Utils.encodePath(fileNode.path());
      }
    } else {
      url = serviceUrl + '/library/' + repoID + '/' + encodeURIComponent(repoName) + Utils.encodePath(fileNode.path());
    }
    return url;
  }

  isInternalFileLink(url) {
    var re = new RegExp(this.serviceUrl + '/lib/[0-9a-f-]{36}/file.*');
    return re.test(url);
  }

  isInternalDirLink(url) {
    var re = new RegExp(serviceUrl + '/library/' + '[0-9a-f\-]{36}.*');
    return re.test(url);
  }

  getFiles() {
    const rootPath = '/';
    return seafileAPI.listDir(repoID, rootPath, { recursive: true} ).then((response) => {
      var files = response.data.dirent_list.map((item) => {
        return {
          name: item.name,
          type: item.type === 'dir' ? 'dir' : 'file',
          parent_path: item.parent_dir
        };
      });
      return files;
    });
  }

  getFileHistory() {
    return seafileAPI.getFileHistory(repoID, filePath);
  }

  getFileInfo() {
    return seafileAPI.getFileInfo(repoID, filePath);
  }

  getRepoInfo(newRepoID) {
    return seafileAPI.getRepoInfo(newRepoID);
  }

  getInternalLink() {
    return seafileAPI.getInternalLink(repoID, filePath);
  }

  getShareLink() {
    return seafileAPI.getShareLink(repoID, filePath);
  }

  createShareLink (repoID, filePath, userPassword, userValidDays, permissions) {
    return seafileAPI.createShareLink(repoID, filePath, userPassword, userValidDays, permissions);
  }

  deleteShareLink(token){
    return seafileAPI.deleteShareLink(token);
  }

  getDraftKey() {
    return (repoID + filePath);
  }

  getFileContent(url) {
    return seafileAPI.getFileContent(url);
  }

  listFileHistoryRecords(page, perPage) {
    return seafileAPI.listFileHistoryRecords(repoID, filePath, page, perPage);
  }

  getFileHistoryVersion(commitID, filePath) {
    return seafileAPI.getFileRevision(repoID, commitID, filePath);
  }

  getCommentsNumber() {
    return seafileAPI.getCommentsNumber(this.repoID, filePath);
  }

  postComment(comment, detail) {
    return seafileAPI.postComment(this.repoID, this.filePath, comment, detail);
  }

  listComments() {
    return seafileAPI.listComments(this.repoID, this.filePath);
  }

  updateComment(commentID, resolved, detail, newComment) {
    return seafileAPI.updateComment(this.repoID, commentID, resolved, detail, newComment);
  }

  deleteComment(commentID) {
    return seafileAPI.deleteComment(this.repoID, commentID);
  }

  getUserAvatar(size) {
    return seafileAPI.getUserAvatar(userName, size);
  }

  goDraftPage() {
    window.location.href = serviceUrl + '/drafts/' + draftID + '/';
  }

  createDraftFile() {
    return seafileAPI.createDraft(repoID, filePath).then(res => {
      window.location.href = serviceUrl + '/lib/' + res.data.origin_repo_id + '/file' + Utils.encodePath(res.data.draft_file_path) + '?mode=edit';
    });
  }

  publishDraftFile() {
    return seafileAPI.publishDraft(draftID).then(res => {
      window.location.href = serviceUrl + '/lib/' + repoID + '/file' + Utils.encodePath(res.data.published_file_path);
    });
  }

  fileMetaData() {
    return seafileAPI.fileMetaData(repoID, filePath);
  }

  listFileTags = () => {
    return seafileAPI.listFileTags(repoID, filePath);
  }

  listRepoTags = () => {
    return seafileAPI.listRepoTags(repoID);
  }

  markdownLint(slateValue) {
    return seafileAPI.markdownLint(slateValue);
  }

  listFileParticipant() {
    return seafileAPI.listFileParticipants(repoID, filePath);
  }

  addFileParticipants(emails) {
    return seafileAPI.addFileParticipants(repoID, filePath, emails);
  }

  listRepoRelatedUsers() {
    return seafileAPI.listRepoRelatedUsers(repoID);
  }
}

const editorApi = new EditorApi();

class MarkdownEditor extends React.Component {
  constructor(props) {
    super(props);
    this.timer = null;
    this.localDraft = '';
    this.autoSave = false;
    this.draftRichValue = '';
    this.draftPlainValue = '';
    this.state = {
      markdownContent: '',
      loading: true,
      mode: 'editor',
      fileInfo: {
        repoID: repoID,
        name: fileName,
        path: filePath,
        mtime: null,
        size: 0,
        starred: false,
        permission: '',
        lastModifier: '',
        id: '',
      },
      editorMode: 'rich',
      collabServer: seafileCollabServer ? seafileCollabServer : null,
      localDraftDialog: false,
      showMarkdownEditorDialog: false,
      showShareLinkDialog: false,
      showInsertFileDialog: false,
      showInsertRepoImageDialog: false,
      showFileParticipantDialog: false,
      showDraftSaved: false,
      collabUsers: userInfo ?
        [{user: userInfo, is_editing: false}] : [],
      value: null,
      isShowHistory: false,
      readOnly: true,
      contentChanged: false,
      saving: false,
      isLocked: isLocked,
      lockedByMe: lockedByMe,
      relatedFiles: [],
      fileTagList: [],
      showRelatedFileDialog: false,
      showEditFileTagDialog: false,
      viewMode: 'list_related_file',
      participants: [],
    };

    if (this.state.collabServer) {
      const socket = io(this.state.collabServer);
      this.socket = socket;
      socket.on('presence', (data) => this.receivePresenceData(data));
      socket.on('repo_update', (data) => this.receiveUpdateData(data));
      socket.on('connect', () => {
        this.socket_id = socket.id;
      });
    }
  }

  toggleLockFile = () => {
    const { repoID, path } = this.state.fileInfo;
    if (this.state.isLocked) {
      seafileAPI.unlockfile(repoID, path).then((res) => {
        this.setState({ isLocked: false, lockedByMe: false });
      });
    } else {
      seafileAPI.lockfile(repoID, path).then((res) => {
        this.setState({ isLocked: true, lockedByMe: true });
      });
    }
  }

  emitSwitchEditor = (is_editing=false) => {
    if (userInfo && this.state.collabServer) {
      const { repoID, path } = this.state.fileInfo;
      this.socket.emit('presence', {
        request: 'editing',
        doc_id: CryptoJS.MD5(repoID+path).toString(),
        user: userInfo,
        is_editing,
      });
    }
  }

  receiveUpdateData (data) {
    let currentTime = new Date();
    if ((parseFloat(currentTime - this.lastModifyTime)/1000) <= 5) {
      return;
    }
    editorApi.fileMetaData().then((res) => {
      if (res.data.id !== this.state.fileInfo.id) {
        toaster.notify(
          <span>
            {gettext('This file has been updated.')}
            <a href='' >{' '}{gettext('Refresh')}</a>
          </span>,
          {id: 'repo_updated', duration: 3600});
      }
    });
  }


  receivePresenceData(data) {
    switch(data.response) {
      case 'user_join':
        toaster.notify(`user ${data.user.name} joined`, {
          duration: 3
        });
        return;

      case 'user_left':
        toaster.notify(`user ${data.user.name} left`, {
          duration: 3
        });
        return;
      case 'update_users':
        for (var prop in data.users) {
          if (Object.prototype.hasOwnProperty.call(data.users, prop)) {
            if (prop === this.socket_id) {
              data.users[prop]['myself'] = true;
              break;
            }
          }
        }
        this.setState({collabUsers: Object.values(data.users)});
        return;
      case 'user_editing':
        toaster.danger(`user ${data.user.name} is editing this file!`, {
          duration: 3
        });
        return;
      default:
        console.log('unknown response type: ' + data.response);
        return;
    }
  }

  toggleCancel = () => {
    this.setState({
      showMarkdownEditorDialog: false,
      showShareLinkDialog: false,
      showInsertFileDialog: false,
      showInsertRepoImageDialog: false,
      showRelatedFileDialog: false,
      showEditFileTagDialog: false,
      showFileParticipantDialog: false,
    });
  }

  setEditorMode = (type) => {
    this.setState({
      editorMode: type
    });
  }

  setDraftValue = (type, value) => {
    if (type === 'rich') {
      this.draftRichValue = value;
    } else {
      this.draftPlainValue = value;
    }
  }

  setContent = (str) => {
    let value = deserialize(str);
    this.setState({
      markdownContent: str,
      value: value,
    });
  }

  checkDraft = () => {
    let draftKey = editorApi.getDraftKey();
    let draft = localStorage.getItem(draftKey);
    let that = this;
    if (draft) {
      that.setState({
        localDraftDialog: true,
      });
      that.localDraft = draft;
      localStorage.removeItem(draftKey);
    }
  }

  useDraft = () => {
    this.setState({
      localDraftDialog: false,
      loading: false,
      markdownContent: this.localDraft,
      editorMode: 'rich',
    });
    this.emitSwitchEditor(true);
  }

  deleteDraft = () => {
    if (this.state.localDraftDialog) {
      this.setState({
        localDraftDialog: false,
        loading: false,
      });
    }
    let draftKey = editorApi.getDraftKey();
    localStorage.removeItem(draftKey);
  }

  closeDraftDialog = () => {
    this.setState({
      localDraftDialog: false
    });
  }

  clearTimer = () => {
    clearTimeout(this.timer);
    this.timer = null;
  }

  openDialogs = (option) => {
    switch(option)
    {
      case 'help':
        window.richMarkdownEditor.showHelpDialog();
        break;
      case 'share_link':
        this.setState({
          showMarkdownEditorDialog: true,
          showShareLinkDialog: true,
        });
        break;
      case 'insert_file':
        this.setState({
          showMarkdownEditorDialog: true,
          showInsertFileDialog: true,
        });
        break;
      case 'insert_repo_image':
        this.setState({
          showMarkdownEditorDialog: true,
          showInsertRepoImageDialog: true,
        });
        break;
      case 'related_files':
        if (this.state.relatedFiles.length > 0) {
          this.setState({
            showRelatedFileDialog: true,
            showMarkdownEditorDialog: true,
            viewMode: 'list_related_file',
          });
        }
        else {
          this.setState({
            showRelatedFileDialog: true,
            showMarkdownEditorDialog: true,
            viewMode: 'add_related_file',
          });
        }
        break;
      case 'file_tags':
        this.setState({
          showEditFileTagDialog: true,
          showMarkdownEditorDialog: true,
        });
        break;
      case 'add-participant':
        this.setState({
          showMarkdownEditorDialog: true,
          showFileParticipantDialog: true,
        });
        break;
      default:
        return;
    }
  }

  componentWillUnmount() {

    this.socket.emit('repo_update', {
      request: 'unwatch_update',
      repo_id: editorApi.repoID,
      user: {
        name: editorApi.name,
        username: editorApi.username,
        contact_email: editorApi.contact_email,
      },
    });
  }

  async componentDidMount() {

    // get file info
    const fileInfoRes = await seafileAPI.getFileInfo(repoID, filePath);
    const { mtime, size, starred, permission, last_modifier_name, id } = fileInfoRes.data;
    const lastModifier = last_modifier_name;

    // get file download url
    const fileDownloadUrlRes = await seafileAPI.getFileDownloadLink(repoID, filePath);
    const downloadUrl = fileDownloadUrlRes.data;

    // get file content 
    const fileContentRes = await seafileAPI.getFileContent(downloadUrl);
    const markdownContent = fileContentRes.data;
    const value = deserialize(markdownContent);

    // init permission
    let hasPermission = permission === 'rw' || permission === 'cloud-edit';

    // get custom permission
    if (permission.startsWith('custom-')) {
      const permissionID = permission.split('-')[1];
      const customPermissionRes = await seafileAPI.getCustomPermission(repoID, permissionID);
      const customPermission = customPermissionRes.data.permission;
      const { modify: canModify } = customPermission.permission;
      hasPermission = canModify ? true : hasPermission;
    }

    // Goto rich edit page
    // First, the user has the relevant permissions, otherwise he can only enter the viewer interface or cannot access
    // case1: If file is draft file
    // case2: If mode == 'edit' and the file has no draft
    // case3: The length of markDownContent is 1 when clear all content in editor and the file has no draft
    const { fileInfo } = this.state;
    this.setState({
      loading: false,
      fileInfo: {...fileInfo, mtime, size, starred, permission, lastModifier, id},
      markdownContent,
      value,
      readOnly: !hasPermission || hasDraft,
    });

    if (userInfo && this.socket) {
      const { repoID, path } = this.state.fileInfo;
      this.socket.emit('presence', {
        request: 'join_room',
        doc_id: CryptoJS.MD5(repoID+path).toString(),
        user: userInfo
      });

      this.socket.emit('repo_update', {
        request: 'watch_update',
        repo_id: editorApi.repoID,
        user: {
          name: editorApi.name,
          username: editorApi.username,
          contact_email: editorApi.contact_email,
        },
      });
    }
    this.checkDraft();
    this.listRelatedFiles();
    this.listFileTags();

    this.listFileParticipants();
    window.showParticipants = true;
    setTimeout(() => {
      let url = new URL(window.location.href);
      if (url.hash) {
        window.location.href = url;
      }
    }, 100);
  }

  listRelatedFiles = () => {
    seafileAPI.listRelatedFiles(repoID, filePath).then(res => {
      this.setState({ relatedFiles: res.data.related_files });
    });
  }

  listFileTags = () => {
    seafileAPI.listFileTags(repoID, filePath).then(res => {
      let fileTagList = res.data.file_tags;
      for (let i = 0; i < fileTagList.length; i++) {
        fileTagList[i].id = fileTagList[i].file_tag_id;
      }
      this.setState({ fileTagList: fileTagList });
    });
  }

  onRelatedFileChange = () => {
    this.listRelatedFiles();
  }

  onFileTagChanged = () => {
    this.listFileTags();
  }

  listFileParticipants = () => {
    editorApi.listFileParticipant().then((res) => {
      this.setState({ participants: res.data.participant_list });
    });
  }

  onParticipantsChange = () => {
    this.listFileParticipants();
  }

  setFileInfoMtime = (fileInfo) => {
    this.setState({
      fileInfo: Object.assign({}, this.state.fileInfo, { mtime: fileInfo.mtime, id: fileInfo.id, lastModifier: fileInfo.last_modifier_name })
    });
  };

  toggleStar = () => {
    let starrd = this.state.fileInfo.starred;
    if (starrd) {
      editorApi.unstarItem().then((response) => {
        this.setState({
          fileInfo: Object.assign({}, this.state.fileInfo, {starred: !starrd})
        });
      });
    } else if (!starrd) {
      editorApi.starItem().then((response) => {
        this.setState({
          fileInfo: Object.assign({}, this.state.fileInfo, {starred: !starrd})
        });
      });
    }
  }

  autoSaveDraft = () => {
    let that = this;
    if (that.timer) {
      return;
    }
    else {
      that.timer = setTimeout(() => {
        let str = '';
        if (this.state.editorMode == 'rich') {
          let value = this.draftRichValue;
          str = serialize(value);
        }
        else if (this.state.editorMode == 'plain') {
          str = this.draftPlainValue;
        }
        let draftKey = editorApi.getDraftKey();
        localStorage.setItem(draftKey, str);
        that.setState({
          showDraftSaved: true
        });
        setTimeout(() => {
          that.setState({
            showDraftSaved: false
          });
        }, 3000);
        that.timer = null;
      }, 60000);
    }
  }

  openParentDirectory = () => {
    window.location.href = editorApi.getParentDectionaryUrl();
  }

  onEdit = (mode) => {
    if (mode === 'rich') {
      window.seafileEditor.switchToRichTextEditor();
    } else if (mode === 'plain') {
      window.seafileEditor.switchToPlainTextEditor();
    }
  }

  toggleShareLinkDialog = () => {
    this.openDialogs('share_link');
  }

  onCommentAdded = () => {
    this.toggleCancel();
  }

  addComment = (e) => {
    e.stopPropagation();
    this.openDialogs('comment');
  }

  scrollToNode = (node) => {
    let url = new URL(window.location.href);
    url.set('hash', 'user-content-' + node.text);
    window.location.href = url.toString();
  }

  toggleHistory = () => {
    window.location.href = siteRoot + 'repo/file_revisions/' + repoID + '/?p=' + Utils.encodePath(filePath);
  }

  getInsertLink = (repoID, filePath) => {
    const fileName = Utils.getFileName(filePath);
    const suffix = fileName.slice(fileName.indexOf('.') + 1);
    if (IMAGE_SUFFIXES.includes(suffix)) {
      seafileAPI.getFileDownloadLink(repoID, filePath).then((res) => {
        window.richMarkdownEditor.addLink(fileName, res.data, true);
      });
      return;
    }
    let innerURL = serviceUrl + '/lib/' + repoID + '/file' + Utils.encodePath(filePath);
    window.richMarkdownEditor.addLink(fileName, innerURL);
  }

  onContentChanged = (value) => {
    this.setState({ contentChanged: value });
  }

  onSaving = (value) => {
    this.setState({ saving: value });
  }

  render() {
    let component;
    if (this.state.loading) {
      return (
        <div className="empty-loading-page">
          <div className="lds-ripple page-centered"><div></div><div></div></div>
        </div>
      );
    } else if (this.state.mode === 'editor') {
      component = (
        <Fragment>
          <MarkdownViewerToolbar
            isDocs={isDocs}
            hasDraft={hasDraft}
            isDraft={isDraft}
            editorApi={editorApi}
            collabUsers={this.state.collabUsers}
            fileInfo={this.state.fileInfo}
            toggleStar={this.toggleStar}
            openParentDirectory={this.openParentDirectory}
            openDialogs={this.openDialogs}
            toggleShareLinkDialog={this.toggleShareLinkDialog}
            onEdit={this.onEdit}
            toggleNewDraft={editorApi.createDraftFile}
            showFileHistory={this.state.isShowHistory ? false : true }
            toggleHistory={this.toggleHistory}
            readOnly={this.state.readOnly}
            mode={this.state.mode}
            editorMode={this.state.editorMode}
            contentChanged={this.state.contentChanged}
            saving={this.state.saving}
            showDraftSaved={this.state.showDraftSaved}
            isLocked={this.state.isLocked}
            lockedByMe={this.state.lockedByMe}
            toggleLockFile={this.toggleLockFile}
          />
          <SeafileEditor
            scriptSource={mediaUrl + 'js/mathjax/tex-svg.js'}
            fileInfo={this.state.fileInfo}
            markdownContent={this.state.markdownContent}
            editorApi={editorApi}
            collabUsers={this.state.collabUsers}
            setFileInfoMtime={this.setFileInfoMtime}
            toggleStar={this.toggleStar}
            showFileHistory={true}
            setEditorMode={this.setEditorMode}
            setContent={this.setContent}
            draftID={draftID}
            isDraft={isDraft}
            mode={this.state.mode}
            emitSwitchEditor={this.emitSwitchEditor}
            hasDraft={hasDraft}
            editorMode={this.state.editorMode}
            siteRoot={siteRoot}
            autoSaveDraft={this.autoSaveDraft}
            setDraftValue={this.setDraftValue}
            clearTimer={this.clearTimer}
            openDialogs={this.openDialogs}
            deleteDraft={this.deleteDraft}
            readOnly={this.state.readOnly}
            onContentChanged={this.onContentChanged}
            onSaving={this.onSaving}
            contentChanged={this.state.contentChanged}
            saving={this.state.saving}
            fileTagList={this.state.fileTagList}
            relatedFiles={this.state.relatedFiles}
            participants={this.state.participants}
            onParticipantsChange={this.onParticipantsChange}
            markdownLint={fileName.toLowerCase() !== 'index.md'}
          />
        </Fragment>
      );

      return (
        <React.Fragment>
          {this.state.localDraftDialog ?
            <ModalPortal>
              <LocalDraftDialog
                localDraftDialog={this.state.localDraftDialog}
                deleteDraft={this.deleteDraft}
                closeDraftDialog={this.closeDraftDialog}
                useDraft={this.useDraft}
              />
            </ModalPortal>
            : null}
          {component}
          {this.state.showMarkdownEditorDialog && (
            <React.Fragment>
              {this.state.showInsertFileDialog &&
                <ModalPortal>
                  <InsertFileDialog
                    repoID={repoID}
                    filePath={filePath}
                    toggleCancel={this.toggleCancel}
                    getInsertLink={this.getInsertLink}
                  />
                </ModalPortal>
              }
              {this.state.showInsertRepoImageDialog &&
                <ModalPortal>
                  <InsertRepoImageDialog
                    repoID={repoID}
                    filePath={filePath}
                    toggleCancel={this.toggleCancel}
                  />
                </ModalPortal>
              }
              {this.state.showShareLinkDialog &&
                <ModalPortal>
                  <ShareDialog
                    itemType="file"
                    itemName={this.state.fileInfo.name}
                    itemPath={filePath}
                    repoID={repoID}
                    toggleDialog={this.toggleCancel}
                    isGroupOwnedRepo={false}
                    repoEncrypted={false}
                  />
                </ModalPortal>
              }
              {this.state.showEditFileTagDialog &&
                <ModalPortal>
                  <EditFileTagDialog
                    repoID={repoID}
                    filePath={filePath}
                    fileTagList={this.state.fileTagList}
                    toggleCancel={this.toggleCancel}
                    onFileTagChanged={this.onFileTagChanged}
                  />
                </ModalPortal>
              }
              {this.state.showRelatedFileDialog &&
                <ModalPortal>
                  <RelatedFileDialogs
                    repoID={repoID}
                    filePath={filePath}
                    relatedFiles={this.state.relatedFiles}
                    toggleCancel={this.toggleCancel}
                    onRelatedFileChange={this.onRelatedFileChange}
                    dirent={this.state.fileInfo}
                    viewMode={this.state.viewMode}
                  />
                </ModalPortal>
              }
              {this.state.showFileParticipantDialog &&
                <ModalPortal>
                  <FileParticipantDialog
                    repoID={repoID}
                    filePath={filePath}
                    toggleFileParticipantDialog={this.toggleCancel}
                    fileParticipantList={this.state.participants}
                    onParticipantsChange={this.onParticipantsChange}
                  />
                </ModalPortal>
              }
            </React.Fragment>
          )}
        </React.Fragment>
      );
    }
  }
}

export default  MarkdownEditor;
