import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@reach/router';
import { siteRoot } from '../../utils/constants';
import SidePanel from './side-panel';
import MainPanel from './main-panel';

import Info from './info';

import DesktopDevices from './devices/desktop-devices';
import MobileDevices from './devices/mobile-devices';
import DeviceErrors from './devices/devices-errors';

import AllRepos from './repos/all-repos';
import SystemRepo from './repos/system-repo';
import TrashRepos from './repos/trash-repos';
import DirView from './repos/dir-view';

import Groups from './groups/groups';
import GroupRepos from './groups/group-repos';
import GroupMembers from './groups/group-members';

import WebSettings from './web-settings/web-settings';
import Notifications from './notifications/notifications';
import FileScanRecords from './file-scan-records';
import WorkWeixinDepartments from './work-weixin-departments';

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
      currentTab: 'file-scan'
    };
  }

  componentDidMount() {
    let href = window.location.href.split('/');
    let currentTab = href[href.length - 2];

    const pageList = [
      {
        tab: 'devices',
        urlPartList: ['desktop-devices', 'mobile-devices', 'device-errors']
      },
      {
        tab: 'libraries',
        urlPartList: ['all-libraries', 'system-library', 'trash-libraries', 'libraries/']
      },
      {
        tab: 'groups',
        urlPartList: ['groups/']
      },
    ];
    const tmpTab = this.getCurrentTabForPageList(pageList);
    currentTab = tmpTab ? tmpTab : currentTab;

    this.setState({currentTab: currentTab});
  }

  getCurrentTabForPageList = (pageList) => {
    let urlPartList, tab;
    const urlBase = `${siteRoot}sys/`;
    for (let i = 0, len = pageList.length; i < len; i++) {
      urlPartList = pageList[i].urlPartList;
      tab = pageList[i].tab;
      for (let j = 0, jlen = urlPartList.length; j < jlen; j++) {
        if (location.href.indexOf(`${urlBase}${urlPartList[j]}`) != -1) {
          return tab;
        }
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
            <AllRepos path={siteRoot + 'sys/all-libraries'} />
            <SystemRepo path={siteRoot + 'sys/system-library'} />
            <TrashRepos path={siteRoot + 'sys/trash-libraries'} />
            <DirView path={siteRoot + 'sys/libraries/:repoID/*'} />
            <WebSettings path={siteRoot + 'sys/web-settings'} />
            <Notifications path={siteRoot + 'sys/notifications'} />
            <Groups path={siteRoot + 'sys/groups'} />
            <GroupRepos path={siteRoot + 'sys/groups/:groupID/libraries'} />
            <GroupMembers path={siteRoot + 'sys/groups/:groupID/members'} />
            <FileScanRecords
              path={siteRoot + 'sys/file-scan-records'}
              currentTab={currentTab} 
              tabItemClick={this.tabItemClick}
            />
            <WorkWeixinDepartments
              path={siteRoot + 'sys/work-weixin'}
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
