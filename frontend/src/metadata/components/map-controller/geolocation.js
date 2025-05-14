import classnames from 'classnames';
import { Utils } from '../../../utils/utils';

export function createGeolocationControl({
  ControlClass,
  Position,
  mapInstance,
  offset,
  getGeolocation,
  callback,
  events = { click: 'click' },
}) {
  return class UniversalGeolocationControl {
    constructor() {
      this.container = document.createElement('div');
      this.className = classnames(
        'sf-map-control-container sf-map-geolocation-control-container d-flex align-items-center justify-content-center',
        { 'sf-map-geolocation-control-mobile': !Utils.isDesktop() }
      );

      this.container.className = this.className;
      this.setupPosition(Position, offset);
      this.createButton();
      this.setupEventHandlers(getGeolocation, callback);
    }

    createButton() {
      this.button = document.createElement('div');
      this.button.className = 'sf-map-control sf-map-geolocation-control d-flex align-items-center justify-content-center';
      this.button.innerHTML = '<i class="sf-map-control-icon sf3-font sf3-font-current-location"></i>';
      this.container.appendChild(this.button);
    }

    setupPosition(position, offset) {
      if (ControlClass && mapInstance) {
        mapInstance.controls[position].push(this.container);
      }
    }

    setupEventHandlers(getGeolocation, callback) {
      this.container.addEventListener(events.click, async (e) => {
        e.preventDefault();
        const originalClass = this.container.className;
        this.container.className = classnames(originalClass, 'sf-map-control-loading');

        try {
          const position = await new Promise((resolve, reject) => {
            getGeolocation(resolve, reject);
          });

          if (position) {
            const point = {
              lng: position.coords.longitude,
              lat: position.coords.latitude
            };
            callback(point);
          }
        } catch (error) {
          // console.error('Geolocation error:', error);
        } finally {
          this.container.className = originalClass;
        }
      });
    }

    get() {
      return this.container;
    }
  };
}

export function createBMapGeolocationControl(BMapGL, callback) {
  function GeolocationControl() {
    this.defaultAnchor = window.BMAP_ANCHOR_BOTTOM_RIGHT;
    this.defaultOffset = new BMapGL.Size(30, Utils.isDesktop() ? 30 : 90);
  }
  GeolocationControl.prototype = new BMapGL.Control();
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
