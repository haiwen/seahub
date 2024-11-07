import { Utils } from '../../../utils/utils';

export function createBMapGeolocationControl(BMap, callback) {
  function GeolocationControl() {
    this.defaultAnchor = window.BMAP_ANCHOR_BOTTOM_RIGHT;
    if (!Utils.isDesktop) {
      this.defaultOffset = new BMap.Size(10, 90);
    } else {
      this.defaultOffset = new BMap.Size(10, 20);
    }
  }
  GeolocationControl.prototype = new window.BMap.Control();
  GeolocationControl.prototype.initialize = (map) => {
    let div = document.createElement('div');
    div.className = 'plugin-BMap-geolocation-control';
    let icon = document.createElement('i');
    icon.className = 'dtable-font dtable-icon-current-location';
    div.appendChild(icon);
    if (!Utils.isDesktop) {
      setNodeStyle(div, 'height: 35px; width: 35px; line-height: 35px; opacity: 0.75');
      setNodeStyle(icon, 'font-size: 20px');
    } else {
      setNodeStyle(div, 'height: 30px; width: 30px; line-height: 30px');
    }
    div.onclick = (e) => {
      const geolocation = new BMap.Geolocation();
      div.className = 'plugin-BMap-geolocation-control plugin-BMap-geolocation-control-loading';
      geolocation.getCurrentPosition((result) => {
        div.className = 'plugin-BMap-geolocation-control';
        if (result) {
          const point = result.point;
          map.setCenter(point);
          callback(null, point);
        } else {
          // Positioning failed
          callback(true);
        }
      });
    };
    map.getContainer().appendChild(div);
    return div;
  };

  return GeolocationControl;
}

function setNodeStyle(dom, styleText) {
  dom.style.cssText += styleText;
}
