import React, { Component } from 'react';
import DevicesByPlatform from './devices-by-platform';

class MobileDevices extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
          <DevicesByPlatform
            devicesPlatform={'mobile'}
          />
        </div>
      </div>
    );
  }
}

export default MobileDevices;
