import React from 'react';
import {
  EXTERNAL_EVENTS,
  EventBus,
  MarkdownEditor as SeafileMarkdownEditor,
} from '@seafile/seafile-editor';
import URL from 'url-parse';
import { seafileAPI } from '@/api/seafile-api';
import InsertFileDialog from '@/components/dialog/insert-file-dialog';
import ShareDialog from '@/components/dialog/share-dialog';
import toaster from '@/components/toast';
import RepoNotificationWebSocket from '@/services/repo-notification-websocket';
import { gettext, mediaUrl } from '@/utils/constants';
import { Utils } from '@/utils/utils';
import DetailListView from './detail-list-view';
import editorApi from './editor-api';
import HeaderToolbar from './header-toolbar';

import './css/markdown-editor.css';

const { repoID, filePath, fileName, isLocked, lockedByMe, filePerm } = window.app.pageOptions;
const { siteRoot, serviceUrl } = window.app.config;
const userInfo = window.app.userInfo;
const IMAGE_SUFFIXES = ['png', 'PNG', 'jpg', 'JPG', 'jpeg', 'JPEG', 'gif', 'GIF'];

class MarkdownEditor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      markdownContent: '',
      loading: true,
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
      showMarkdownEditorDialog: false,
      showShareLinkDialog: false,
      showInsertFileDialog: false,
      collabUsers: userInfo ?
        [{ user: userInfo, is_editing: false }] : [],
      readOnly: true,
      contentChanged: false,
      saving: false,
      isLocked: isLocked,
      lockedByMe: lockedByMe,
      participants: [],
      isCommentUpdated: false,
    };

    this.timer = null;

    this.editorRef = React.createRef();
    this.isParticipant = false;
    this.editorSelection = null;
    this.socketManager = new RepoNotificationWebSocket(this.onMessageCallback, repoID);
  }

  toggleLockFile = () => {
    const { repoID, path } = this.state.fileInfo;
    if (this.state.isLocked) {
      seafileAPI.unlockfile(repoID, path).then(() => {
        this.setState({ isLocked: false, lockedByMe: false });
      });
    } else {
      seafileAPI.lockfile(repoID, path).then(() => {
        this.setState({ isLocked: true, lockedByMe: true });
      });
    }
  };

  onMessageCallback = (data) => {
    const { type, content } = data;
    if (type === 'comment-update') {
      const { repo_id, file_uuid } = content;
      if (repoID === repo_id && window.app.pageOptions.fileUuid === file_uuid) {
        this.setState({ isCommentUpdated: true });
      }
    }
  };

  toggleCancel = () => {
    this.setState({
      showMarkdownEditorDialog: false,
      showShareLinkDialog: false,
      showInsertFileDialog: false,
    });
  };

  setEditorMode = () => {
    const { origin, pathname } = window.location;
    window.location.href = origin + pathname + '?mode=plain';
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
    const fileIcon = Utils.getFileIconUrl(fileName);
    document.getElementById('favicon').href = fileIcon;

    // get file info
    const fileInfoRes = await seafileAPI.getFileInfo(repoID, filePath);
    const { mtime, size, starred, permission, last_modifier_name, id } = fileInfoRes.data;
    const lastModifier = last_modifier_name;
    const { rawPath } = window.app.pageOptions;
    // get file content
    const fileContentRes = await seafileAPI.getFileContent(rawPath);
    const markdownContent = fileContentRes.data;

    // init permission
    let hasPermission = permission === 'rw' || permission === 'cloud-edit';

    // get custom permission
    if (permission.startsWith('custom-')) {
      const permissionID = permission.split('-')[1];
      const customPermissionRes = await seafileAPI.getCustomPermission(repoID, permissionID);
      const customPermission = customPermissionRes.data.permission;
      const { modify: canModify } = customPermission.permission;
      hasPermission = canModify || hasPermission;
    }

    // Goto rich edit page
    // First, the user has the relevant permissions, otherwise he can only enter the viewer interface or cannot access
    const { fileInfo } = this.state;
    this.setState({
      loading: false,
      fileInfo: { ...fileInfo, mtime, size, starred, permission, lastModifier, id },
      markdownContent,
      readOnly: !hasPermission,
    });

    this.listFileParticipants();
    window.showParticipants = true;
    setTimeout(() => {
      const url = new URL(window.location.href);
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
    this.socketManager.close();
  }

  onUnload = (event) => {
    const { contentChanged } = this.state;
    if (!contentChanged) return;
    this.clearTimer();

    const confirmationMessage = gettext('Leave this page? The system may not save your changes.');
    event.returnValue = confirmationMessage;
    return confirmationMessage;
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
    const newFileInfo = { ...oldFileInfo, mtime: fileInfo.mtime, id: fileInfo.id, lastModifier: fileInfo.last_modifier_name };
    this.setState({ fileInfo: newFileInfo });
  };

  toggleStar = () => {
    const { fileInfo } = this.state;
    const { starred } = fileInfo;
    const newFileInfo = { ...fileInfo, starred: !starred };
    if (starred) {
      editorApi.unstarItem().then(() => {
        this.setState({ fileInfo: newFileInfo });
      });
      return;
    }

    editorApi.starItem().then(() => {
      this.setState({ fileInfo: newFileInfo });
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
    const editor = this.editorRef.current.getEditor();
    if (IMAGE_SUFFIXES.includes(suffix)) {
      let innerURL = serviceUrl + '/lib/' + repoID + '/file' + Utils.encodePath(filePath) + '?raw=1';
      eventBus.dispatch(EXTERNAL_EVENTS.INSERT_ATTACHMENTS, editor, { title: fileName, url: innerURL, isImage: true, selection });
      return;
    }
    let innerURL = serviceUrl + '/lib/' + repoID + '/file' + Utils.encodePath(filePath);
    eventBus.dispatch(EXTERNAL_EVENTS.INSERT_ATTACHMENTS, editor, { title: fileName, url: innerURL, selection });
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
    editorApi.addFileParticipants(emails).then(() => {
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

      const message = gettext('Successfully saved');
      toaster.success(message, { duration: 2, });

      editorApi.getFileInfo().then((res) => {
        this.setFileInfoMtime(res.data);
      });

      this.addParticipants();
    }, () => {
      this.setState({ saving: false });
      const message = gettext('Failed to save');
      toaster.danger(message, { duration: 2 });
    });
  };

  getFileName = (fileName) => {
    return fileName.substring(0, fileName.lastIndexOf('.'));
  };

  render() {
    const { loading, markdownContent, fileInfo, isLocked } = this.state;

    return (
      <>
        <HeaderToolbar
          editorApi={editorApi}
          collabUsers={this.state.collabUsers}
          fileInfo={this.state.fileInfo}
          toggleStar={this.toggleStar}
          openDialogs={this.openDialogs}
          toggleShareLinkDialog={this.toggleShareLinkDialog}
          onEdit={this.setEditorMode}
          showFileHistory
          toggleHistory={this.toggleHistory}
          readOnly={this.state.readOnly}
          editorMode={this.state.editorMode}
          contentChanged={this.state.contentChanged}
          saving={this.state.saving}
          onSaveEditorContent={this.onSaveEditorContent}
          isLocked={this.state.isLocked}
          lockedByMe={this.state.lockedByMe}
          toggleLockFile={this.toggleLockFile}
          participants={this.state.participants}
          isCommentUpdated={this.state.isCommentUpdated}
        />
        <div className={`sf-md-viewer-content ${isLocked ? 'locked' : ''}`}>
          <SeafileMarkdownEditor
            ref={this.editorRef}
            isFetching={loading}
            isReadonly={filePerm !== 'rw' || isLocked}
            initValue={this.getFileName(fileName)}
            value={markdownContent}
            editorApi={editorApi}
            onSave={this.onSaveEditorContent}
            onContentChanged={this.onContentChanged}
            mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'}
          >
            <DetailListView fileInfo={fileInfo} />
          </SeafileMarkdownEditor>
        </div>
        {this.state.showMarkdownEditorDialog && (
          <>
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
          </>
        )}
      </>
    );
  }
}

export default MarkdownEditor;
