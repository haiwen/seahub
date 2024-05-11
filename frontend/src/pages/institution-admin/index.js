import React from 'react';
import ReactDom from 'react-dom';
import SidePanel from './side-panel';
import Users from './users';
import MainPanel from '../sys-admin/main-panel';

import '../../css/layout.css';
import '../../css/toolbar.css';

export default function Institutions() {
  return (
    <div id="main">
      <SidePanel></SidePanel>
      <MainPanel>
        <Users />
      </MainPanel>
    </div>
  );
}

ReactDom.render(<Institutions />, document.getElementById('wrapper'));
