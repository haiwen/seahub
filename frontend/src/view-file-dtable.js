import React from 'react';
import ReactDOM from 'react-dom';
import { seafileAPI } from './utils/seafile-api';
import ViewFileDtable from '@seafile/dtable/es';
import './css/view-file-dtable.css';

const { server, workspaceID, username, userNickName, contactEmail, fileName, filePath, dtableUuid, dtableServer, dtableSocket } = window.app.pageOptions;
window.dtable = {};
window.dtable = {
  workspaceID: workspaceID,
  username: username,
  name: userNickName,
  contactEmail: contactEmail,
  server: server,
  dtableServer: "http://127.0.0.1:5000/",
  dtableSocket: "http://127.0.0.1:5000/",
  filePath: filePath,
  fileName: fileName,
  dtableUuid: dtableUuid,
  accessToken: ''
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
  <ViewFileSDB />,
  document.getElementById('wrapper')
);