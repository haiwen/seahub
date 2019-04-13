import React from 'react';
import ReactDOM from 'react-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { seafileAPI } from './utils/seafile-api';
import io from 'socket.io-client';
import { gettext } from './utils/constants';

import { RichEditor } from '@seafile/seafile-editor';
import  { EditorUtilities } from '@seafile/seafile-editor/dist/editorUtilities';
import toaster from './components/toast';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './index.css';
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
      collabUsers: userInfo ?
      [{user: userInfo, is_editing: false}] : [],
      fileInfo: {
        repoID: repoID,
        name: fileName,
        path: filePath,
        lastModifier: '',
        id: '',
      },
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

  componentDidMount() {
    editorUtilities.getFileInfo(repoID, filePath).then((res) => {
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
    })

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

  render() {
    return(
      <I18nextProvider i18n={ i18n } initialLanguage={ lang } >
        <RichEditor
          collabUsers = {this.state.collabUsers}
          editorUtilities = {editorUtilities}
        /> 
      </I18nextProvider>
    )
  }
}


ReactDOM.render (
  <CDOCEditor/>,
  document.getElementById('wrapper')
);
