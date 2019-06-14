import React from 'react';
import ReactDOM from 'react-dom';
import { seafileAPI } from './utils/seafile-api';
import SeafileTable from '@seafile/dtable/lib';

import "./css/dtable.css";

class ViewFileSDB extends React.Component {

  render() {
    return (
      <SeafileTable pageOptions={window.app.pageOptions} seafileAPI={seafileAPI}/>
    );
  }
}

ReactDOM.render(
  <ViewFileSDB />,
  document.getElementById('wrapper')
);