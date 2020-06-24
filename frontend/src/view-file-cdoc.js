import React, { Suspense} from 'react';
import ReactDOM from 'react-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n-seafile-editor';
import { seafileAPI } from './utils/seafile-api';
import io from 'socket.io-client';
import { gettext } from './utils/constants';
import ModalPortal from './components/modal-portal';
import { RichEditor } from '@seafile/seafile-editor';
import CDOCTypeChooser from '@seafile/seafile-editor/dist/components/codc-type-chooser';
import CDOCTopbar from './components/toolbar/cdoc-editor-topbar';
import ShareDialog from './components/dialog/share-dialog';
import { Utils } from './utils/utils';
import Loading from './components/loading';
import { withTranslation } from 'react-i18next';

import { EditorApi } from '@seafile/seafile-editor/dist/editor-api';
import toaster from './components/toast';
import { RichEditorUtils } from '@seafile/seafile-editor/dist/rich-editor-utils';

import './css/markdown-viewer/markdown-editor.css';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './index.css';

const CryptoJS = require('crypto-js');

const { repoID, repoName, filePath, fileName, username, contactEmail } = window.app.pageOptions;
const { siteRoot, seafileCollabServer, serviceURL } = window.app.config;
const { name } = window.app.userInfo;

let dirPath = '/';
const editorApi = new EditorApi(seafileAPI, repoID, fileName, dirPath, name, filePath, serviceURL, username, contactEmail, repoName);
const userInfo = window.app.userInfo;
class CDOCEditor extends React.Component {

  constructor(props) {
    super(props);
    this.collabServer = seafileCollabServer ? seafileCollabServer : null;
    this.richEditorUtils = new RichEditorUtils(editorApi, this);
    this.state = {
      value: [],
      collabUsers: userInfo ?
        [{ user: userInfo, is_editing: false }] : [],
      fileInfo: {
        repoID: repoID,
        name: fileName,
        path: filePath,
        lastModifier: '',
        id: '',
      },
      isShowTypeChooser: false,
      isSaving: false,
      contentChanged: false,
      showShareLinkDialog: false,
      isShowHistory: false,
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

  componentDidMount() {
    if (userInfo && this.socket) {
      const { repoID, path } = this.state.fileInfo;
      this.socket.emit('presence', {
        request: 'join_room',
        doc_id: CryptoJS.MD5(repoID + path).toString(),
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
  }

  receiveUpdateData(data) {
    let currentTime = new Date();
    if ((parseFloat(currentTime - this.lastModifyTime) / 1000) <= 5) {
      return;
    }
    editorApi.fileMetaData().then((res) => {
      if (res.data.id !== this.state.fileInfo.id) {
        toaster.notify(
          <span>
            {gettext('This file has been updated.')}
            <a href='' >{' '}{gettext('Refresh')}</a>
          </span>,
          { id: 'repo_updated', duration: 3600 });
      }
    });
  }

  receivePresenceData(data) {
    switch (data.response) {
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
        this.setState({ collabUsers: Object.values(data.users) });
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

  toggleStar = () => {
    let starrd = this.state.fileInfo.starred;
    if (starrd) {
      editorApi.unStarItem().then((response) => {
        this.setState({
          fileInfo: Object.assign({}, this.state.fileInfo, { starred: !starrd })
        });
      });
    } else if (!starrd) {
      editorApi.starItem().then((response) => {
        this.setState({
          fileInfo: Object.assign({}, this.state.fileInfo, { starred: !starrd })
        });
      });
    }
  }

  toggleHistory = () => {
    window.location.href = siteRoot + 'repo/file_revisions/' + repoID + '/?p=' + Utils.encodePath(filePath);
  }

  backToParentDirectory = () => {
    window.location.href = editorApi.getParentDectionaryUrl();
  }

  toggleShareLinkDialog = () => {
    this.openDialogs('share_link');
  }

  toggleCancel = () => {
    this.setState({
      showShareLinkDialog: false,
    });
  }

  openDialogs = (option) => {
    switch (option) {
      case 'help':
        window.richEditor.showHelpDialog();
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
      default:
        return;
    }
  }

  componentWillMount() {
    this.richEditorUtils.initialContent();
    editorApi.getFileInfo().then((response) => {
      this.setState({
        fileInfo: Object.assign({}, this.state.fileInfo, {
          mtime: response.data.mtime,
          size: response.data.size,
          name: response.data.name,
          starred: response.data.starred,
          lastModifier: response.data.last_modifier_name,
          permission: response.data.permission,
          id: response.data.id,
        })
      });
    });
  }

  render() {
    return (
      <React.Fragment>
        <CDOCTopbar
          fileInfo={this.state.fileInfo}
          collabUsers={this.state.collabUsers}
          toggleStar={this.toggleStar}
          editorApi={editorApi}
          backToParentDirectory={this.backToParentDirectory}
          toggleShareLinkDialog={this.toggleShareLinkDialog}
          openDialogs={this.openDialogs}
          showFileHistory={this.state.isShowHistory ? false : true}
          toggleHistory={this.toggleHistory}
          saving={this.state.isSaving}
          onSave={this.richEditorUtils.onSave}
          contentChanged={this.state.contentChanged}
        />
        <RichEditor
          onSave={this.richEditorUtils.onSave}
          resetContentChange={this.richEditorUtils.resetContentChange}
          value={this.state.value}
          onChange={this.richEditorUtils.onChange}
          editorApi={editorApi}
        />
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
        {
          this.state.isShowTypeChooser &&
          <CDOCTypeChooser
            showTypeChooser={this.state.isShowTypeChooser}
            setDocument={this.richEditorUtils.setDocument}
          />
        }
      </React.Fragment>
    );
  }
}

const TranslatedCDOCEditor = withTranslation('translations')(CDOCEditor);

ReactDOM.render(
  <I18nextProvider i18n={i18n} >
    <Suspense fallback={<Loading />}>
      <TranslatedCDOCEditor />
    </Suspense>
  </I18nextProvider>
  ,
  document.getElementById('wrapper')
);
