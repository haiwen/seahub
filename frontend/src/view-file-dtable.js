import React from 'react';
import ReactDOM from 'react-dom';
import { seafileAPI } from './utils/seafile-api';
import ViewFileDtable from '@seafile/dtable/es';
import './css/view-file-dtable.css';

const { server, workspaceID, username, userNickName, contactEmail, fileName, filePath, dtableUuid } = window.app.pageOptions;
window.dtable = {};
window.dtable = {
  workspaceID: workspaceID,
  username: username,
  name: userNickName,
  contactEmail: contactEmail,
  server: server,
  dtableServer: "http://dev.seafile.com/dtable-server/",
  filePath: filePath,
  fileName: fileName,
  dtableUuid: dtableUuid,
  accessToken: '12345678'
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