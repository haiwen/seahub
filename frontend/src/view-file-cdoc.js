import React from 'react';
import ReactDOM from 'react-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { seafileAPI } from './utils/seafile-api';
import io from 'socket.io-client';
import { gettext } from './utils/constants';
import ModalPortal from './components/modal-portal';
import { RichEditor } from './src/editor/editor';
import CDOCTypeChooser from './src/components/codc-type-chooser';
import { Value } from 'slate';
import CDOCTopbar from './components/toolbar/cdoc-editor-topbar';
import ShareDialog from './components/dialog/share-dialog';
import { Utils } from './utils/utils';
import { translate } from 'react-i18next';

import  { EditorUtilities } from '@seafile/seafile-editor/dist/editorUtilities';
import toaster from './components/toast';
import './css/markdown-viewer/markdown-editor.css';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './index.css';
const JSZip = require('jszip');
const request = require('request');

const CryptoJS = require('crypto-js');

const lang = window.app.config.lang;

const { repoID, repoName, filePath, fileName, username, contactEmail } = window.app.pageOptions;
const { siteRoot, seafileCollabServer, serviceURL} = window.app.config;
const { name } = window.app.userInfo;

let dirPath = '/'; 
const editorUtilities = new EditorUtilities(seafileAPI, repoID, fileName, dirPath, name, filePath, serviceURL, username, contactEmail, repoName);
const userInfo = window.app.userInfo;
class CDOCEditor extends React.Component {

  constructor(props) {
    super(props);
    this.collabServer = seafileCollabServer ? seafileCollabServer : null
    this.state = {
      value: Value.create({}),
      collabUsers: userInfo ?
      [{user: userInfo, is_editing: false}] : [],
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
    }

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

  resetContentChange = () => {
    this.setState({
      contentChanged: false
    })
  }

  componentDidMount() {
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

  toggleHistory = () => {
    window.location.href = siteRoot + 'repo/file_revisions/' + repoID + '/?p=' + Utils.encodePath(filePath);
  }
  
  backToParentDirectory = () => {
    window.location.href = editorUtilities.getParentDectionaryUrl();
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
    switch(option)
    {
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

  initialContent(){
    const that = this;
    editorUtilities.getFileDownloadLink().then((res) => {
      request({ method : 'GET', url : res.data, encoding: null}, function (error, response, body) {
        if (error || response.statusCode !== 200) {
          console.log(error);
          return;
        }
        if (body.length === 0 ) {
          that.setState({
            isShowTypeChooser: true,
          });
          return;
        }
        JSZip.loadAsync(body).then((zip) => {
          if (zip.file('content.json')) {
            zip.file('content.json').async('string').then((res) => {
              const value = { object: 'value', document: JSON.parse(res) };
              that.setState({
                value: Value.create(value),
              });
            }, (err) => {
              console.log(err);
            });
          }
          if (zip.file('info.json')) {
            zip.file('info.json').async('string').then((res) => {
              that.setState({
                zipVersion: JSON.parse(res).version,
              });
              this.documentType = JSON.parse(res).type;
            }, (err) => {
              console.log(err);
            });
          }
          // const assets = zip.folder('assets/'); // get images in the future
        });
      });
    });
  }

  componentWillMount() {
    this.initialContent();
    editorUtilities.getFileInfo().then((response) => {
      this.setState({
        fileInfo:Object.assign({}, this.state.fileInfo, {
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

  onChange = (editor) => {
    const ops = editor.operations
    .filter(o => o.type !== 'set_selection' && o.type !== 'set_value');
    if (ops.size !== 0) {
      this.setState({
        contentChanged: true,
        value: editor.value
      })
    }
  }

  onSave = (editor) => {
    const info = { 'version': 1, type: this.documentType };
    let zip = new JSZip();
    this.setState({
      isSaving: true
    });
    zip.file('info.json', JSON.stringify(info));
    zip.file('content.json', JSON.stringify(this.state.value.document));
    zip.folder('assets');
    zip.generateAsync({ type: 'blob' }).then((blob) => {
      editorUtilities.saveContent(blob).then(() =>{
        this.setState({
          isSaving: false,
          contentChanged: false
        });
        toaster.success(this.props.t('file_saved'), {
          duration: 2,
        });
        editorUtilities.getFileInfo().then((res) => {
          this.setFileInfoMtime(res.data);
        });
      }, (err) => {
        this.setState({
          isSaving: false
        });
      });
    }, function (err) {
      this.setState({
        isSaving: false
      });
      console.log(err);
    });
  }

  setFileInfoMtime = (fileInfo) => {
    this.setState({
      fileInfo: Object.assign({}, this.state.fileInfo, { mtime: fileInfo.mtime, id: fileInfo.id, lastModifier: fileInfo.last_modifier_name })
    });
  };

  setDocument = (type, value) => {
    this.setState({
      value: value,
    });
    this.documentType = type;
    // save the document type
    {
      const info = { 'version': 1, type: type};
      let zip = new JSZip();
      zip.file('info.json', JSON.stringify(info));
      zip.file('content.json', JSON.stringify(value.document));
      zip.folder('assets');
      zip.generateAsync({ type: 'blob' }).then((blob) => {
        editorUtilities.saveContent(blob).then(() =>{
          editorUtilities.getFileInfo().then((res) => {
            this.setFileInfoMtime(res.data);
          });
        }, (err) => {
        });
      }, function (err) {
        console.log(err);
      });
    }
    this.toggleTypeChooser();
  }

  toggleTypeChooser = () => {
    this.setState({
      isShowTypeChooser: !this.state.isShowTypeChooser
    });
  }

  render() {
    return(
      <React.Fragment>
        <CDOCTopbar
          fileInfo={this.state.fileInfo}
          collabUsers={this.state.collabUsers}
          toggleStar={this.toggleStar}
          editorUtilities={editorUtilities}
          backToParentDirectory={this.backToParentDirectory}
          toggleShareLinkDialog={this.toggleShareLinkDialog}
          openDialogs={this.openDialogs}
          showFileHistory={this.state.isShowHistory ? false : true }
          toggleHistory={this.toggleHistory}
          saving={this.state.isSaving}
          onSave={this.onSave}
          contentChanged={this.state.contentChanged}
        />
        <RichEditor
          onSave = {this.onSave}
          resetContentChange = {this.resetContentChange}
          value = {this.state.value}
          onChange = {this.onChange}
          editorUtilities = {editorUtilities}
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
            setDocument = {this.setDocument}
          />
        }
      </React.Fragment> 
    )
  }
}

 const TranslatedCDOCEditor = translate('translations')(CDOCEditor)

ReactDOM.render (
  <I18nextProvider i18n={ i18n } initialLanguage={ lang } >
     <TranslatedCDOCEditor/>
  </I18nextProvider>
  ,
  document.getElementById('wrapper')
);
