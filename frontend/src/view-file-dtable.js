import React from 'react';
import ReactDOM from 'react-dom';
import { seafileAPI } from './utils/seafile-api';
import ViewFileDtable from '@seafile/dtable/es';
import './css/view-file-dtable.css';

class ViewFileSDB extends React.Component {

  render() {
    window.app.pageOptions['dtableServer'] = "http://dev.seafile.com/dtable-server/";
    return (
      <ViewFileDtable seafileAPI={seafileAPI} pageOptions={window.app.pageOptions} />
    );
  }
}

ReactDOM.render(
  <ViewFileSDB />,
  document.getElementById('wrapper')
);