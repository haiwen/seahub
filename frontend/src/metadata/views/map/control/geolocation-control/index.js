import classnames from 'classnames';
import { Utils } from '../../../../../utils/utils';

import './index.css';

export function createBMapGeolocationControl(BMapGL, callback) {
  function GeolocationControl() {
    this.defaultAnchor = window.BMAP_ANCHOR_BOTTOM_RIGHT;
    this.defaultOffset = new BMapGL.Size(30, Utils.isDesktop() ? 30 : 90);
  }
  GeolocationControl.prototype = new BMapGL.Control();
  GeolocationControl.prototype.initialize = function (map) {
    const div = document.createElement('div');
    let className = classnames('sf-map-control-container sf-map-geolocation-control d-flex align-items-center justify-content-center', {
      'sf-map-geolocation-control-mobile': !Utils.isDesktop()
    });

    const locationButton = document.createElement('div');
    locationButton.className = 'sf-map-control d-flex align-items-center justify-content-center';
    locationButton.innerHTML = '<i class="sf-map-control-icon sf3-font sf3-font-current-location"></i>';
    div.appendChild(locationButton);

    div.className = className;
    div.onclick = (e) => {
      e.preventDefault();
      const geolocation = new BMapGL.Geolocation();
      div.className = classnames(className, 'sf-map-control-loading');
      geolocation.getCurrentPosition((result) => {
        div.className = className;
        if (result) {
          const point = result.point;
          callback(point);
        } else {
          // Positioning failed
          callback();
        }
      });
    };
    map.getContainer().appendChild(div);
    return div;
  };

  return GeolocationControl;
}
