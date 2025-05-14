import classnames from 'classnames';
import { Utils } from '../../../utils/utils';

export function createZoomControl({
  ControlClass,
  Position,
  mapInstance,
  minZoom,
  maxZoom,
  getZoom,
  setZoom,
  onZoomChanged,
  saveState,
  events = { click: 'click' }
}) {
  return class UniversalZoomControl {
    constructor() {
      this.container = document.createElement('div');
      this.container.className = classnames(
        'sf-map-control-container sf-map-zoom-control-container d-flex align-items-center justify-content-center',
        { 'sf-map-control-container-mobile': !Utils.isDesktop() }
      );

      this.zoomInButton = this.createButton('<i class="sf-map-control-icon sf3-font sf3-font-zoom-in"></i>');
      this.divider = this.createDivider();
      this.zoomOutButton = this.createButton('<i class="sf-map-control-icon sf3-font sf3-font-zoom-out"></i>');

      this.container.appendChild(this.zoomInButton);
      this.container.appendChild(this.divider);
      this.container.appendChild(this.zoomOutButton);

      this.updateButtonStates();
      this.setupPosition(Position);
      this.setupEventListeners({ getZoom, setZoom, onZoomChanged, saveState });
    }

    createButton(innerHTML) {
      const button = document.createElement('div');
      button.className = 'sf-map-control sf-map-zoom-control d-flex align-items-center justify-content-center';
      button.innerHTML = innerHTML;
      return button;
    }

    createDivider() {
      const divider = document.createElement('div');
      divider.className = 'sf-map-control-divider';
      return divider;
    }

    setupPosition(position) {
      if (ControlClass && mapInstance) {
        mapInstance.controls[position].push(this.container);
      }
    }

    setupEventListeners({ getZoom, setZoom, onZoomChanged, saveState }) {
      this.zoomInButton.addEventListener('click', (e) => {
        e.preventDefault();
        const nextZoom = Math.min(getZoom() + 1, maxZoom);
        setZoom(nextZoom);
        saveState?.();
      });

      this.zoomOutButton.addEventListener('click', (e) => {
        e.preventDefault();
        const nextZoom = Math.max(getZoom() - 1, minZoom);
        setZoom(nextZoom);
        saveState?.();
      });

      if (onZoomChanged) {
        onZoomChanged(() => this.updateButtonStates());
      }
    }

    updateButtonStates() {
      const zoomLevel = getZoom();
      this.zoomInButton.classList.toggle('disabled', zoomLevel >= maxZoom);
      this.zoomOutButton.classList.toggle('disabled', zoomLevel <= minZoom);
    }

    get() {
      return this.container;
    }
  };
}

export function createBMapZoomControl(BMapGL, { maxZoom, minZoom, offset }, callback) {
  function ZoomControl() {
    this.defaultAnchor = window.BMAP_ANCHOR_BOTTOM_RIGHT;
    this.defaultOffset = new BMapGL.Size(offset.x, offset.y);
  }
  ZoomControl.prototype = new BMapGL.Control();
  ZoomControl.prototype.initialize = function (map) {
    const zoomLevel = map.getZoom();
    const div = document.createElement('div');
    div.className = classnames('sf-map-control-container sf-map-zoom-control-container d-flex align-items-center justify-content-center', {
      'sf-map-control-container-mobile': !Utils.isDesktop()
    });

    const buttonClassName = 'sf-map-control  sf-map-zoom-control d-flex align-items-center justify-content-center';
    const zoomInButton = document.createElement('div');
    zoomInButton.className = classnames(buttonClassName, { 'disabled': zoomLevel >= maxZoom });
    zoomInButton.innerHTML = '<i class="sf-map-control-icon sf3-font sf3-font-zoom-in"></i>';
    div.appendChild(zoomInButton);

    const divider = document.createElement('div');
    divider.className = 'sf-map-control-divider';
    div.appendChild(divider);

    const zoomOutButton = document.createElement('div');
    zoomOutButton.className = classnames(buttonClassName, { 'disabled': zoomLevel <= minZoom });
    zoomOutButton.innerHTML = '<i class="sf-map-control-icon sf3-font sf3-font-zoom-out"></i>';
    div.appendChild(zoomOutButton);

    const updateButtonStates = () => {
      const zoomLevel = map.getZoom();
      zoomInButton.className = classnames(buttonClassName, { 'disabled': zoomLevel >= maxZoom });
      zoomOutButton.className = classnames(buttonClassName, { 'disabled': zoomLevel <= minZoom });
      callback && callback(zoomLevel);
    };

    zoomInButton.onclick = (e) => {
      e.preventDefault();
      const nextZoom = map.getZoom() + 1;
      map.zoomTo(Math.min(nextZoom, maxZoom));
    };

    zoomOutButton.onclick = (e) => {
      e.preventDefault();
      const nextZoom = map.getZoom() - 1;
      map.zoomTo(Math.max(nextZoom, minZoom));
    };

    map.addEventListener('zoomend', updateButtonStates);
    map.getContainer().appendChild(div);
    return div;
  };

  return ZoomControl;
}
