import React from 'react';
import ReactDOM from 'react-dom';
import { seafileAPI } from './utils/seafile-api';
import ViewFileDtable from '@seafile/dtable/es';
import './css/view-file-dtable.css';

class ViewFileSDB extends React.Component {

  render() {
    return (
      <ViewFileDtable seafileAPI={seafileAPI} pageOptions={window.app.pageOptions} />
    );
  }
}

ReactDOM.render(
  <ViewFileSDB />,
  document.getElementById('wrapper')
);