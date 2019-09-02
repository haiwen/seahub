import React from 'react';
import ReactDOM from 'react-dom';
import { seafileAPI } from './utils/seafile-api';
import ViewFileDtable from '@seafile/dtable/es';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n-dtable';
import './css/view-file-dtable.css';

const { server, workspaceID, username, userNickName, contactEmail, fileName, filePath, dtableUuid, dtableServer, dtableSocket, mediaUrl, lang } = window.app.pageOptions;
window.dtable = {};
window.dtable = {
  workspaceID: workspaceID,
  username: username,
  name: userNickName,
  contactEmail: contactEmail,
  server: server,
  dtableServer: dtableServer,
  dtableSocket: dtableSocket,
  filePath: filePath,
  fileName: fileName,
  dtableUuid: dtableUuid,
  mediaUrl: mediaUrl,
  accessToken: '',
  lang: lang
};

window.seafileAPI = seafileAPI;

class ViewFileSDB extends React.Component {

  render() {
    return (
      <ViewFileDtable />
    );
  }
}

ReactDOM.render(
  <I18nextProvider i18n={ i18n }>
    <ViewFileSDB />
  </I18nextProvider>,
  document.getElementById('wrapper')
);