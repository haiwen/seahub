import React from 'react';
import ReactDom from 'react-dom';
import { LocationProvider, createHistory } from '@gatsbyjs/reach-router';
import SidePanel from './side-panel';
import MainPanel from './main-panel';

import '../../css/layout.css';
import '../../css/toolbar.css';

export default function Institutions() {

  const history = createHistory(window);

  return (
    <LocationProvider history={history}>
      <div id="main">
        <SidePanel />
        <MainPanel />
      </div>
    </LocationProvider>
  );
}

ReactDom.render(<Institutions />, document.getElementById('wrapper'));
