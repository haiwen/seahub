import React, { Component } from 'react';
import DevicesByPlatform from './devices-by-platform';

class DesktopDevices extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
          <DevicesByPlatform
            devicesPlatform={'desktop'}
          />
        </div>
      </div>
    );
  }
}

export default DesktopDevices;
