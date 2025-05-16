import classnames from 'classnames';
import { Utils } from '../../../utils/utils';

export const createGeolocationControl = (map) => {
  const container = document.createElement('div');
  container.className = classnames(
    'sf-map-control-container sf-map-geolocation-control-container d-flex align-items-center justify-content-center',
    { 'sf-map-geolocation-control-mobile': !Utils.isDesktop() }
  );

  const button = document.createElement('div');
  button.className = 'sf-map-control sf-map-geolocation-control d-flex align-items-center justify-content-center';
  button.innerHTML = '<i class="sf-map-control-icon sf3-font sf3-font-current-location"></i>';
  container.appendChild(button);

  container.addEventListener('click', async (e) => {
    e.preventDefault();
    const originalClass = container.className;
    container.className = classnames(originalClass, 'sf-map-control-loading');

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      if (position) {
        const point = {
          lng: position.coords.longitude,
          lat: position.coords.latitude
        };
        map.setCenter(point);
      }
    } catch (error) {
      // console.error('Geolocation error:', error);
    } finally {
      container.className = originalClass;
    }
  });

  return container;
};

export function createBMapGeolocationControl({ anchor, offset, callback }) {
  function GeolocationControl() {
    this.defaultAnchor = anchor || window.BMAP_ANCHOR_BOTTOM_RIGHT;
    this.defaultOffset = new window.BMapGL.Size(offset?.x || 30, offset?.y || 90);
  }
  GeolocationControl.prototype = new window.BMapGL.Control();
  GeolocationControl.prototype.initialize = function (map) {
    const div = document.createElement('div');
    let className = classnames('sf-map-control-container sf-map-geolocation-control-container d-flex align-items-center justify-content-center', {
      'sf-map-geolocation-control-mobile': !Utils.isDesktop()
    });

    const locationButton = document.createElement('div');
    locationButton.className = 'sf-map-control sf-map-geolocation-control d-flex align-items-center justify-content-center';
    locationButton.innerHTML = '<i class="sf-map-control-icon sf3-font sf3-font-current-location"></i>';
    div.appendChild(locationButton);

    div.className = className;
    div.onclick = (e) => {
      e.preventDefault();
      const geolocation = new window.BMapGL.Geolocation();
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
