import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@reach/router';
import { siteRoot } from '../../utils/constants';
import SidePanel from './side-panel';
import MainPanel from './main-panel';
import FileScanRecords from './file-scan-records';
import WorkWeixinDepartments from './work-weixin-departments';
import Info from './info';
import DesktopDevices from './devices/desktop-devices';
import MobileDevices from './devices/mobile-devices';
import DeviceErrors from './devices/devices-errors';
import ReposAll from './repos/repos-all';
import ReposSystem from './repos/repos-system';
import ReposTrash from './repos/repos-trash';
import ReposTemplate from './repos/repos-template';

import '../../assets/css/fa-solid.css';
import '../../assets/css/fa-regular.css';
import '../../assets/css/fontawesome.css';
import '../../css/layout.css';
import '../../css/toolbar.css';

class SysAdmin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isSidePanelClosed: false,
      currentTab: 'file-scan',
    };
  }

  componentDidMount() {
    let href = window.location.href.split('/');
    let currentTab = href[href.length - 2];
    let tmpTab;

    const devicesUrlParts = ['desktop-devices', 'mobile-devices', 'device-errors'];
    const devicesTab = 'devices';
    tmpTab = this.getCurrentTabForPageList(devicesUrlParts, devicesTab);
    currentTab = tmpTab ? tmpTab : currentTab;

    this.setState({currentTab: currentTab});
  }

  getCurrentTabForPageList = (pageUrlPartList, curTab) => {
    const urlBase = `${siteRoot}sys/`;
    for (let i = 0, len = pageUrlPartList.length; i < len; i++) {
      if (location.href.indexOf(`${urlBase}${pageUrlPartList[i]}`) != -1) {
        return curTab;
      }
    }
  }

  onCloseSidePanel = () => {
    this.setState({isSidePanelClosed: !this.state.isSidePanelClosed});
  }

  tabItemClick = (param) => {
    this.setState({currentTab: param});
  }  

  render() {
    let { currentTab, isSidePanelClosed } = this.state;

    return (
      <div id="main">
        <SidePanel
          isSidePanelClosed={isSidePanelClosed}
          onCloseSidePanel={this.onCloseSidePanel}
          currentTab={currentTab}
          tabItemClick={this.tabItemClick}
        />
        <MainPanel>
          <Router className="reach-router">
            <Info path={siteRoot + 'sys/info'} />
            <DesktopDevices path={siteRoot + 'sys/desktop-devices'} />
            <MobileDevices path={siteRoot + 'sys/mobile-devices'} />
            <DeviceErrors path={siteRoot + 'sys/device-errors'} />
            <ReposAll path={siteRoot + 'sys/libraries-all'} />
            <ReposSystem path={siteRoot + 'sys/libraries-system'} />
            <ReposTrash path={siteRoot + 'sys/libraries-trash'} />
            <ReposTemplate path={siteRoot + 'sys/libraries/:repoID/*'} />
            <FileScanRecords
              path={siteRoot + 'sys/file-scan-records'}
              currentTab={currentTab} 
              tabItemClick={this.tabItemClick}
            />
            <WorkWeixinDepartments
              path={siteRoot + 'sys/work-weixin/departments'}
              currentTab={currentTab}
              tabItemClick={this.tabItemClick}
            />
          </Router>
        </MainPanel>
      </div>
    );
  }
}

ReactDOM.render(
  <SysAdmin />,
  document.getElementById('wrapper')
);
