import React from 'react';
import SeafileEditor from '@seafile/seafile-editor';
import 'whatwg-fetch';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import ModalPortal from './components/modal-portal';
import EditFileTagDialog from './components/dialog/edit-filetag-dialog';
import ListRelatedFileDialog from './components/dialog/list-related-file-dialog';
import AddRelatedFileDialog from './components/dialog/add-related-file-dialog';
import ShareDialog from './components/dialog/share-dialog';
import MarkdownViewerSlate from './components/viewer/markdown-viewer-slate'
import io from "socket.io-client";
import toaster from "@seafile/seafile-editor/dist/components/toast";
import { serialize } from "@seafile/seafile-editor/dist/utils/slate2markdown";
import LocalDraftDialog from "@seafile/seafile-editor/dist/components/local-draft-dialog";
const CryptoJS = require('crypto-js');
const { repoID, repoName, filePath, fileName, mode, draftID, draftFilePath, draftOriginFilePath, isDraft, hasDraft, shareLinkExpireDaysMin, shareLinkExpireDaysMax } = window.app.pageOptions;
const { siteRoot, serviceUrl, seafileCollabServer } = window.app.config;
const userInfo = window.app.userInfo;
const userName = userInfo.username;
let dirPath = '/';

function getImageFileNameWithTimestamp() {
  var d = Date.now();
  return 'image-' + d.toString() + '.png';
}


class EditorUtilities {

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

  unStarItem () {
    return (
      seafileAPI.unStarItem(this.repoID, this.filePath)
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

  uploadImage = (imageFile) => {
    return (
      seafileAPI.getUploadLink(repoID, dirPath).then((res) => {
        let uploadLinkComponent = res.data;
        const uploadLink = uploadLinkComponent + '?ret-json=1';
        const name = getImageFileNameWithTimestamp();
        const blob = imageFile.slice(0, -1, 'image/png');
        const newFile = new File([blob], name, {type: 'image/png'});
        const formData = new FormData();
        formData.append('parent_dir', '/');
        formData.append('relative_path', 'images/auto-upload');
        formData.append('file', newFile);
        return {uploadLink, formData};
      }).then(({ uploadLink, formData}) => {
        return seafileAPI.uploadImage(uploadLink, formData);
      }).then ((res) => {
        let resArr = res.data[0];
        let filename = resArr.name;
        return this._getImageURL(filename);
      })
    );
  }

  uploadLocalImage = (imageFile) => {
    return (
      seafileAPI.getUploadLink(repoID, dirPath).then((res) => {
        const uploadLink = res.data + '?ret-json=1';
        const newFile = new File([imageFile], imageFile.name, {type: imageFile.type});
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
    return seafileAPI.listDir(repoID, dirPath, { recursive: true} ).then((response) => {
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
    return (
      seafileAPI.getFileHistory(repoID, filePath)
    );
  }

  getFileInfo() {
    return (
      seafileAPI.getFileInfo(repoID, filePath)
    );
  }

  getRepoInfo(newRepoID) {
    return (
      seafileAPI.getRepoInfo(newRepoID)
    );
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
    return (
      seafileAPI.listFileHistoryRecords(repoID, filePath, page, perPage)
    );
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

  updateComment(commentID, resolved, detail) {
    return seafileAPI.updateComment(this.repoID, commentID, resolved, detail);
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
}

const editorUtilities = new EditorUtilities();

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
      editorMode: 'viewer',
      collabServer: seafileCollabServer ? seafileCollabServer : null,
      relatedFiles: [],
      fileTagList: [],
      localDraftDialog: false,
      showRelatedFileDialog: false,
      showEditFileTagDialog: false,
      showAddRelatedFileDialog: false,
      showMarkdownEditorDialog: false,
      showShareLinkDialog: false,
      showDraftSaved: false,
      collabUsers: userInfo ?
        [{user: userInfo, is_editing: false}] : [],
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
    editorUtilities.fileMetaData().then((res) => {
      if (res.data.id !== this.state.fileInfo.id) {
        toaster.notify(
          <span>
            {this.props.t('this_file_has_been_updated')}
            <a href='' >{' '}{this.props.t('refresh')}</a>
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
          if (data.users.hasOwnProperty(prop)) {
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
      showRelatedFileDialog: false,
      showEditFileTagDialog: false,
      showAddRelatedFileDialog: false,
      showMarkdownEditorDialog: false,
      showShareLinkDialog: false,
    });
  }

  setEditorMode = (type) => {
    this.setState({
      editorMode: type
    })
  }

  setDraftValue = (type, value) => {
    if (type === 'rich') {
      this.draftRichValue = value
    } else {
      this.draftPlainValue = value;
    }
  }
  setContent = (str) => {
    this.setState({
      markdownContent: str
    });
  }

  checkDraft = () => {
    let draftKey = editorUtilities.getDraftKey();
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
    } else {
      let draftKey = editorUtilities.getDraftKey();
      localStorage.removeItem(draftKey);
    }
  }

  clearTimer = () => {
    clearTimeout(this.timer);
    this.timer = null;
  }

  closeAddRelatedFileDialog = () => {
    this.setState({
      showAddRelatedFileDialog: false,
      showRelatedFileDialog: true,
    });
  }

  addRelatedFileToggle = () => {
    this.setState({
      showRelatedFileDialog: false,
      showAddRelatedFileDialog: true,
    });
  }

  openDialogs = (option) => {
    switch(option)
    {
      case 'related_files':
        if (this.state.relatedFiles.length > 0) {
          this.setState({
            showRelatedFileDialog: true,
            showMarkdownEditorDialog: true,
          });
        }
        else {
          this.setState({
            showAddRelatedFileDialog: true,
            showMarkdownEditorDialog: true,
          });
        }
        break;
      case 'tags':
        this.setState({
          showEditFileTagDialog: true,
          showMarkdownEditorDialog: true,
        });
        break;
      case 'share_link':
        this.setState({
          showMarkdownEditorDialog: true,
          showShareLinkDialog: true,
        });
        break;
      default:
        return;
    }
  }

  componentWillUnmount() {
    this.socket.emit('repo_update', {
      request: 'unwatch_update',
        repo_id: this.props.editorUtilities.repoID,
        user: {
        name: this.props.editorUtilities.name,
          username: this.props.editorUtilities.username,
          contact_email: this.props.editorUtilities.contact_email,
        },
    });
  }

  componentDidMount() {

    seafileAPI.getFileInfo(repoID, filePath).then((res) => {
      let { mtime, size, starred, permission, last_modifier_name, id } = res.data;
      let lastModifier = last_modifier_name;

      this.setState((prevState, props) => ({
        fileInfo: {
          ...prevState.fileInfo,
          mtime,
          size,
          starred,
          permission,
          lastModifier,
          id
        }
      }));

      seafileAPI.getFileDownloadLink(repoID, filePath).then((res) => {
        const downLoadUrl = res.data;
        seafileAPI.getFileContent(downLoadUrl).then((res) => {
          const contentLength = res.data.length;
          let isBlankFile =  (contentLength === 0 || contentLength === 1);
          let hasPermission = (this.state.fileInfo.permission === 'rw');
          let isEditMode = this.state.mode;
          this.setState({
            markdownContent: res.data,
            loading: false,
            // Goto rich edit page
            // First, the user has the relevant permissions, otherwise he can only enter the viewer interface or cannot access
            // case1: If file is draft file
            // case2: If mode == 'edit' and the file has no draft
            // case3: The length of markDownContent is 1 when clear all content in editor and the file has no draft
            editorMode: (hasPermission && (isDraft || (isEditMode && !hasDraft) || (isBlankFile && !hasDraft))) ? 'rich' : 'viewer',
          });
        });
      });
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
          repo_id: editorUtilities.repoID,
          user: {
          name: editorUtilities.name,
            username: editorUtilities.username,
            contact_email: editorUtilities.contact_email,
          },
      });
    }

    this.checkDraft();
    this.listRelatedFiles();
    this.listFileTags();
  }

  listRelatedFiles = () => {
    seafileAPI.listRelatedFiles(repoID, filePath).then(res => {
      this.setState({
        relatedFiles: res.data.related_files
      });
    });
  }

  listFileTags = () => {
    seafileAPI.listFileTags(repoID, filePath).then(res => {
      let fileTagList = res.data.file_tags;
      for (let i = 0, length = fileTagList.length; i < length; i++) {
        fileTagList[i].id = fileTagList[i].file_tag_id;
      }
      this.setState({
        fileTagList: fileTagList
      });
    });
  }

  onRelatedFileChange = () => {
    this.listRelatedFiles();
  }

  onFileTagChanged = () => {
    this.listFileTags();
  }

  setFileInfoMtime = (fileInfo) => {
    this.setState({
      fileInfo: Object.assign({}, this.state.fileInfo, { mtime: fileInfo.mtime, id: fileInfo.id, lastModifier: fileInfo.last_modifier_name })
    });
  };

  toggleStar = () => {
    let starrd = this.state.fileInfo.starred;
    if (starrd) {
      editorUtilities.unStarItem().then((response) => {
        this.setState({
          fileInfo: Object.assign({}, this.state.fileInfo, {starred: !starrd})
        });
      });
    } else if (!starrd) {
      editorUtilities.starItem().then((response) => {
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
    } else {
      that.timer = setTimeout(() => {
        let str = '';
        if (this.state.editorMode == 'rich') {
          let value = this.draftRichValue;
          str = serialize(value.toJSON());
        }
        else if (this.state.editorMode == 'plain') {
          str = this.draftPlainValue;
        }
        let draftKey = editorUtilities.getDraftKey();
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

  render() {
    let component;
    if (this.state.loading) {
      return (
        <div className="empty-loading-page">
          <div className="lds-ripple page-centered"><div></div><div></div></div>
        </div>
      );
    } else if (this.state.mode === 'editor') {
        if (this.state.editorMode === 'viewer') {
          component = (
            <MarkdownViewerSlate
              fileInfo={this.state.fileInfo}
              markdownContent={this.state.markdownContent}
              editorUtilities={editorUtilities}
              collabUsers={this.state.collabUsers}
              showFileHistory={true}
              setFileInfoMtime={this.setFileInfoMtime}
              toggleStar={this.toggleStar}
              setEditorMode={this.setEditorMode}
              draftID={draftID}
              isDraft={isDraft}
              emitSwitchEditor={this.emitSwitchEditor}
              hasDraft={hasDraft}
              shareLinkExpireDaysMin={shareLinkExpireDaysMin}
              shareLinkExpireDaysMax={shareLinkExpireDaysMax}
              relatedFiles={this.state.relatedFiles}
              siteRoot={siteRoot}
              openDialogs={this.openDialogs}
              fileTagList={this.state.fileTagList}
              showDraftSaved={this.state.showDraftSaved}
            />
          )
        } else {
          component = <SeafileEditor
            fileInfo={this.state.fileInfo}
            markdownContent={this.state.markdownContent}
            editorUtilities={editorUtilities}
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
            relatedFiles={this.state.relatedFiles}
            siteRoot={siteRoot}
            autoSaveDraft={this.autoSaveDraft}
            setDraftValue={this.setDraftValue}
            clearTimer={this.clearTimer}
            openDialogs={this.openDialogs}
            fileTagList={this.state.fileTagList}
            deleteDraft={this.deleteDraft}
            showDraftSaved={this.state.showDraftSaved}
          />
        }

      return (
        <React.Fragment>
          {this.state.localDraftDialog?
            <LocalDraftDialog
              localDraftDialog={this.state.localDraftDialog}
              deleteDraft={this.deleteDraft}
              useDraft={this.useDraft}/>:
          null}
          {component}
          {this.state.showMarkdownEditorDialog && (
            <React.Fragment>
              {this.state.showRelatedFileDialog &&
                <ModalPortal>
                  <ListRelatedFileDialog
                    repoID={repoID}
                    filePath={filePath}
                    relatedFiles={this.state.relatedFiles}
                    toggleCancel={this.toggleCancel}
                    addRelatedFileToggle={this.addRelatedFileToggle}
                    onRelatedFileChange={this.onRelatedFileChange}
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
              {this.state.showAddRelatedFileDialog &&
                <ModalPortal>
                  <AddRelatedFileDialog
                    repoID={repoID}
                    filePath={filePath}
                    toggleCancel={this.closeAddRelatedFileDialog}
                    dirent={this.state.fileInfo}
                    onRelatedFileChange={this.onRelatedFileChange}
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
            </React.Fragment>
          )}
        </React.Fragment>
      );
    }   
  }
}

export default  MarkdownEditor;
