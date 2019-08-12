import React, { Component, Fragment } from 'react';
import { Nav, NavItem, NavLink, TabContent, TabPane, Button} from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import DevicesByPlatform from './devices-by-platform';
import DevicesErrors from './devices-errors';
import classnames from 'classnames';
import MainPanelTopbar from '../../org-admin/main-panel-topbar';

class Devices extends Component {

  constructor(props) {
    super(props);
    this.toggle = this.toggle.bind(this);
    this.state = {
      activeTab: 'desktop',
      isShowErrorCleanBtn: false
    };
  }

  componentDidMount() {
    
  }

  toggle(tab) {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab
      });
    }
  }

  clearDevicesAdmin = () => {
    seafileAPI.sysAdminClearDeviceErrors().then((res) => {
      this.setState({devicesErrors: {}});
      let message = gettext('Successfully cleaned all errors.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.setState({
      isShowErrorCleanBtn: false
    });  }

  handleErrorsCleanBtnShow = (isShow) => {
    this.setState({
      isShowErrorCleanBtn: isShow
    });
  }

  render() {
    let topbarChildren;
    if(this.state.activeTab === 'errors' && this.state.isShowErrorCleanBtn){
      topbarChildren = (
        <Button className="float-right" onClick={this.clearDevicesAdmin}>{gettext('Clean')}</Button>
      );
    }
    return (
      <Fragment>
        <MainPanelTopbar children={topbarChildren}/>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path align-items-center">
              <Nav >
                <NavItem>
                  <NavLink
                    className={classnames({ active: this.state.activeTab === 'desktop' })}
                    onClick={() => { this.toggle('desktop'); }}>
                    {gettext('Desktop')}
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={classnames({ active: this.state.activeTab === 'mobile' })}
                    onClick={() => { this.toggle('mobile'); }}>
                    {gettext('Mobile')}
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={classnames({ active: this.state.activeTab === 'errors' })}
                    onClick={() => { this.toggle('errors'); }}>
                    {gettext('Errors')}
                  </NavLink>
                </NavItem>
              </Nav>

            </div>
            <div className="cur-view-content">
              <TabContent activeTab={this.state.activeTab}>
                <TabPane tabId="desktop">
                  {this.state.activeTab === 'desktop' &&
                    <DevicesByPlatform 
                      devicesPlatform={this.state.activeTab}
                    />
                  }
                </TabPane>
                <TabPane tabId="mobile">
                  {this.state.activeTab === 'mobile' &&
                    <DevicesByPlatform 
                      devicesPlatform={this.state.activeTab}
                    />
                  }
                </TabPane>
                <TabPane tabId="errors">
                  {this.state.activeTab === 'errors' &&
                    <DevicesErrors
                      handleErrorsCleanBtnShow={this.handleErrorsCleanBtnShow}
                    />
                  }
                </TabPane>
              </TabContent>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default Devices;
