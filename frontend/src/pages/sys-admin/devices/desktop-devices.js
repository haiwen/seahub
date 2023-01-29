import React, { Component, Fragment } from 'react';
import DevicesNav from './devices-nav';
import DevicesByPlatform from './devices-by-platform';
import MainPanelTopbar from '../main-panel-topbar';

class DesktopDevices extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <DevicesNav currentItem="desktop" />
            <DevicesByPlatform
              devicesPlatform={'desktop'}
            />
          </div>
        </div>
      </Fragment>
    );
  }
}

export default DesktopDevices;
