import React, { useState } from 'react';
import ReactDom from 'react-dom';
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

ReactDom.render(<Institutions />, document.getElementById('wrapper'));
