import React, { Fragment } from 'react';
import io from 'socket.io-client';
import { EXTERNAL_EVENTS, EventBus, RichMarkdownEditor } from '@seafile/seafile-editor';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, isDocs, mediaUrl } from '../../utils/constants';
import toaster from '../../components/toast';
import ShareDialog from '../../components/dialog/share-dialog';
import InsertFileDialog from '../../components/dialog/insert-file-dialog';
import HeaderToolbar from './header-toolbar';
import editorApi from './editor-api';
import DetailListView from './detail-list-view';

import './css/markdown-editor.css';

const CryptoJS = require('crypto-js');
const URL = require('url-parse');

const { repoID, filePath, fileName, isDraft, hasDraft, isLocked, lockedByMe } = window.app.pageOptions;
const { siteRoot, serviceUrl, seafileCollabServer } = window.app.config;
const userInfo = window.app.userInfo;
const IMAGE_SUFFIXES = ['png', 'PNG', 'jpg', 'JPG', 'jpeg', 'JPEG', 'gif', 'GIF'];

class MarkdownEditor extends React.Component {

  constructor(props) {
    super(props);
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
      fileTagList: [],
      participants: [],
    };

    this.timer = null;
    this.localDraft = '';
    this.autoSave = false;
    this.draftRichValue = '';
    this.draftPlainValue = '';

    if (this.state.collabServer) {
      const socket = io(this.state.collabServer);
      this.socket = socket;
      socket.on('presence', (data) => this.receivePresenceData(data));
      socket.on('repo_update', (data) => this.receiveUpdateData(data));
      socket.on('connect', () => {
        this.socket_id = socket.id;
      });
    }
    this.editorRef = React.createRef();
    this.isParticipant = false;
    this.editorSelection = null;
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
  };

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
  };

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
    let collabUsers = [];
    let editingUsers = [];
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
        collabUsers = Object.values(data.users);
        editingUsers = collabUsers.filter(ele => ele.is_editing === true && ele.myself === undefined);
        if (editingUsers.length > 0) {
          const message = gettext('Another user is editing this file!');
          toaster.danger(message, {duration: 3});
        }
        this.setState({ collabUsers });
        return;
      case 'user_editing':
        toaster.danger(`user ${data.user.name} is editing this file!`, {
          duration: 3
        });
        return;
      default:
        // eslint-disable-next-line
        console.log('unknown response type: ' + data.response);
        return;
    }
  }

  toggleCancel = () => {
    this.setState({
      showMarkdownEditorDialog: false,
      showShareLinkDialog: false,
      showInsertFileDialog: false,
    });
  };

  setEditorMode = (editorMode) => { // rich | plain
    this.setState({editorMode: editorMode});
  };

  setDraftValue = (type, value) => {
    if (type === 'rich') {
      this.draftRichValue = value;
    } else {
      this.draftPlainValue = value;
    }
  };

  checkDraft = () => {
    let draftKey = editorApi.getDraftKey();
    let draft = localStorage.getItem(draftKey);
    let that = this;
    if (draft) {
      that.setState({localDraftDialog: true});
      that.localDraft = draft;
      localStorage.removeItem(draftKey);
    }
  };

  useDraft = () => {
    this.setState({
      localDraftDialog: false,
      loading: false,
      markdownContent: this.localDraft,
      editorMode: 'rich',
    });
    this.emitSwitchEditor(true);
  };

  deleteDraft = () => {
    if (this.state.localDraftDialog) {
      this.setState({
        localDraftDialog: false,
        loading: false,
      });
    }
    let draftKey = editorApi.getDraftKey();
    localStorage.removeItem(draftKey);
  };

  closeDraftDialog = () => {
    this.setState({localDraftDialog: false});
  };

  clearTimer = () => {
    clearTimeout(this.timer);
    this.timer = null;
  };

  openDialogs = (option) => {
    switch (option) {
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
      default:
        return;
    }
  };

  async componentDidMount() {

    const fileIcon = Utils.getFileIconUrl(fileName, 192);
    document.getElementById('favicon').href = fileIcon;

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
      value: '',
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
    this.listFileTags();

    this.listFileParticipants();
    window.showParticipants = true;
    setTimeout(() => {
      let url = new URL(window.location.href);
      if (url.hash) {
        window.location.href = url;
      }
    }, 100);
    window.addEventListener('beforeunload', this.onUnload);
    const eventBus = EventBus.getInstance();
    this.unsubscribeInsertSeafileImage = eventBus.subscribe(EXTERNAL_EVENTS.ON_INSERT_IMAGE, this.onInsertImageToggle);
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.onUnload);
    this.unsubscribeInsertSeafileImage();
    if (!this.socket) return;
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

  onUnload = (event) => {
    const { contentChanged } = this.state;
    if (!contentChanged) return;
    this.clearTimer();

    const confirmationMessage = gettext('Leave this page? The system may not save your changes.');
    event.returnValue = confirmationMessage;
    return confirmationMessage;
  };

  listFileTags = () => {
    seafileAPI.listFileTags(repoID, filePath).then(res => {
      let fileTagList = res.data.file_tags;
      for (let i = 0; i < fileTagList.length; i++) {
        fileTagList[i].id = fileTagList[i].file_tag_id;
      }
      this.setState({ fileTagList: fileTagList });
    });
  };

  onFileTagChanged = () => {
    this.listFileTags();
  };

  listFileParticipants = () => {
    editorApi.listFileParticipant().then((res) => {
      this.setState({ participants: res.data.participant_list });
    });
  };

  onParticipantsChange = () => {
    this.listFileParticipants();
  };

  setFileInfoMtime = (fileInfo) => {
    const { fileInfo: oldFileInfo } = this.state;
    const newFileInfo = Object.assign({}, oldFileInfo, { mtime: fileInfo.mtime, id: fileInfo.id, lastModifier: fileInfo.last_modifier_name });
    this.setState({fileInfo: newFileInfo});
  };

  toggleStar = () => {
    const { fileInfo } = this.state;
    const { starred } = fileInfo;
    const newFileInfo = Object.assign({}, fileInfo, {starred: !starred});
    if (starred) {
      editorApi.unstarItem().then((response) => {
        this.setState({fileInfo: newFileInfo});
      });
      return;
    }

    editorApi.starItem().then((response) => {
      this.setState({fileInfo: newFileInfo});
    });
  };

  toggleShareLinkDialog = () => {
    this.openDialogs('share_link');
  };

  onInsertImageToggle = (selection) => {
    this.editorSelection = selection;
    this.openDialogs('insert_file');
  };

  toggleHistory = () => {
    window.location.href = siteRoot + 'repo/file_revisions/' + repoID + '/?p=' + Utils.encodePath(filePath);
  };

  getInsertLink = (repoID, filePath) => {
    const selection = this.editorSelection;
    const fileName = Utils.getFileName(filePath);
    const suffix = fileName.slice(fileName.indexOf('.') + 1);
    const eventBus = EventBus.getInstance();
    if (IMAGE_SUFFIXES.includes(suffix)) {
      let innerURL = serviceUrl + '/lib/' + repoID + '/file' + Utils.encodePath(filePath) + '?raw=1';
      eventBus.dispatch(EXTERNAL_EVENTS.INSERT_IMAGE, { title: fileName, url: innerURL, isImage: true, selection });
      return;
    }
    let innerURL = serviceUrl + '/lib/' + repoID + '/file' + Utils.encodePath(filePath);
    eventBus.dispatch(EXTERNAL_EVENTS.INSERT_IMAGE, { title: fileName, url: innerURL, selection});
  };

  addParticipants = () => {
    if (this.isParticipant || !window.showParticipants) return;
    const { userName } = editorApi;
    const { participants } = this.state;
    if (participants && participants.length !== 0) {
      const isParticipant = participants.some((participant) => {
        return participant.email === userName;
      });
      if (isParticipant) return;
    }

    const emails = [userName];
    editorApi.addFileParticipants(emails).then((res) => {
      this.isParticipant = true;
      this.listFileParticipants();
    });
  };

  onContentChanged = () => {
    this.setState({ contentChanged: true });
  };

  onSaveEditorContent = () => {
    this.setState({ saving: true });
    const content = this.editorRef.current.getValue();
    editorApi.saveContent(content).then(() => {
      this.setState({
        saving: false,
        contentChanged: false,
      });

      this.lastModifyTime = new Date();
      const message = gettext('Successfully saved');
      toaster.success(message, {duration: 2,});

      editorApi.getFileInfo().then((res) => {
        this.setFileInfoMtime(res.data);
      });

      this.addParticipants();
    }, () => {
      this.setState({ saving: false });
      const message = gettext('Failed to save');
      toaster.danger(message, {duration: 2});
    });
  };

  render() {
    const { loading, editorMode, markdownContent, fileInfo, fileTagList } = this.state;

    return (
      <Fragment>
        <HeaderToolbar
          isDocs={isDocs}
          hasDraft={hasDraft}
          isDraft={isDraft}
          editorApi={editorApi}
          collabUsers={this.state.collabUsers}
          fileInfo={this.state.fileInfo}
          toggleStar={this.toggleStar}
          openDialogs={this.openDialogs}
          toggleShareLinkDialog={this.toggleShareLinkDialog}
          onEdit={this.setEditorMode}
          toggleNewDraft={editorApi.createDraftFile}
          showFileHistory={this.state.isShowHistory ? false : true }
          toggleHistory={this.toggleHistory}
          readOnly={this.state.readOnly}
          editorMode={this.state.editorMode}
          contentChanged={this.state.contentChanged}
          saving={this.state.saving}
          onSaveEditorContent={this.onSaveEditorContent}
          showDraftSaved={this.state.showDraftSaved}
          isLocked={this.state.isLocked}
          lockedByMe={this.state.lockedByMe}
          toggleLockFile={this.toggleLockFile}
        />
        <div className='sf-md-viewer-content'>
          <RichMarkdownEditor
            ref={this.editorRef}
            mode={editorMode}
            isFetching={loading}
            initValue={fileName}
            value={markdownContent}
            editorApi={editorApi}
            onSave={this.onSaveEditorContent}
            onContentChanged={this.onContentChanged}
            mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'}
            isSupportInsertSeafileImage={true}
          >
            <DetailListView fileInfo={fileInfo} fileTagList={fileTagList} onFileTagChanged={this.onFileTagChanged}/>
          </RichMarkdownEditor>
        </div>
        {this.state.showMarkdownEditorDialog && (
          <React.Fragment>
            {this.state.showInsertFileDialog &&
              <InsertFileDialog
                repoID={repoID}
                filePath={filePath}
                toggleCancel={this.toggleCancel}
                getInsertLink={this.getInsertLink}
              />
            }
            {this.state.showShareLinkDialog &&
              <ShareDialog
                itemType="file"
                itemName={this.state.fileInfo.name}
                itemPath={filePath}
                repoID={repoID}
                toggleDialog={this.toggleCancel}
                isGroupOwnedRepo={false}
                repoEncrypted={false}
              />
            }
          </React.Fragment>
        )}
      </Fragment>
    );
  }
}

export default  MarkdownEditor;
