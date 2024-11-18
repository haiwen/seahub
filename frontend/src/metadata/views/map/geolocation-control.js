import { mediaUrl } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

export function createBMapGeolocationControl(BMap, callback) {
  function GeolocationControl() {
    this.defaultAnchor = window.BMAP_ANCHOR_BOTTOM_RIGHT;
    this.defaultOffset = new BMap.Size(10, Utils.isDesktop() ? 20 : 90);
  }
  GeolocationControl.prototype = new window.BMap.Control();
  GeolocationControl.prototype.initialize = function (map) {
    const div = document.createElement('div');
    div.className = 'sf-BMap-geolocation-control';
    div.style = 'display: flex; justify-content: center; align-items: center;';

    const icon = document.createElement('img');
    icon.className = 'sf-BMap-icon-current-location';
    icon.src = `${mediaUrl}/img/current-location.svg`;
    icon.style = 'width: 16px; height: 16px; display: block;';
    div.appendChild(icon);
    if (Utils.isDesktop()) {
      setNodeStyle(div, 'height: 30px; width: 30px; line-height: 30px');
    } else {
      setNodeStyle(div, 'height: 35px; width: 35px; line-height: 35px; opacity: 0.75');
    }
    div.onclick = (e) => {
      e.preventDefault();
      const geolocation = new BMap.Geolocation();
      div.className = 'sf-BMap-geolocation-control sf-BMap-geolocation-control-loading';
      geolocation.getCurrentPosition((result) => {
        div.className = 'sf-BMap-geolocation-control';
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
