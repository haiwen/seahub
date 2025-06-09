import React, { useState } from 'react';
import { LocationProvider, globalHistory } from '@gatsbyjs/reach-router';
import { createRoot } from 'react-dom/client';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import SidePanel from './side-panel';
import MainPanel from './main-panel';

import '../../css/layout.css';
import '../../css/toolbar.css';

export default function Institutions() {

  const [isSidePanelClosed, setIsSidePanelClosed] = useState(false);

  const toggleSidePanel = () => {
    setIsSidePanelClosed(!isSidePanelClosed);
  };

  return (
    <>
      <div id="main">
        <SidePanel isSidePanelClosed={isSidePanelClosed} onCloseSidePanel={toggleSidePanel} />
        <MainPanel toggleSidePanel={toggleSidePanel} />
      </div>
      <MediaQuery query="(max-width: 767.8px)">
        <Modal zIndex="1030" isOpen={!isSidePanelClosed} toggle={toggleSidePanel} contentClassName="d-none"></Modal>
      </MediaQuery>
    </>
  );
}

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <LocationProvider history={globalHistory}>
    <Institutions />
  </LocationProvider>
);
