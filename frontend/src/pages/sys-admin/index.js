import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@reach/router';
import { siteRoot } from '../../utils/constants';
import SidePanel from './side-panel';
import MainPanel from './main-panel';
import FileScanRecords from './file-scan-records';
import WorkWeixinDepartments from './work-weixin-departments';
import Info from './info';
import Devices from './devices/devices';

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
    this.setState({currentTab: href[href.length - 2]});
  }

  onCloseSidePanel = () => {
    this.setState({isSidePanelClosed: !this.state.isSidePanelClosed});
  }

  tabItemClick = (param) => {
    this.setState({currentTab: param});          
  }  

  render() {
    let { currentTab, isSidePanelClosed,  } = this.state;

    return (
      <div id="main">
        <SidePanel isSidePanelClosed={isSidePanelClosed} onCloseSidePanel={this.onCloseSidePanel} currentTab={currentTab}/>
        <MainPanel>
          <Router className="reach-router">
            <Info
              path={siteRoot + 'sys/info'}
              currentTab={currentTab}
              tabItemClick={this.tabItemClick}
            />
            <Devices
              path={siteRoot + 'sys/devices'}
              currentTab={currentTab}
              tabItemClick={this.tabItemClick}
            />
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
