import React, { Component, Fragment } from 'react';
import MainPanelTopbar from '../main-panel-topbar';
import DevicesByPlatform from './devices-by-platform';
import DevicesNav from './devices-nav';

class MobileDevices extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Fragment>
        <MainPanelTopbar />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <DevicesNav currentItem="mobile" />
            <DevicesByPlatform
              devicesPlatform={'mobile'}
            />
          </div>
        </div>
      </Fragment>
    );
  }
}

export default MobileDevices;
