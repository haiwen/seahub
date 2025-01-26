import classnames from 'classnames';
import { Utils } from '../../../../../utils/utils';

import './index.css';

export function createBMapZoomControl(BMapGL, { maxZoom, minZoom }, callback) {
  function ZoomControl() {
    this.defaultAnchor = window.BMAP_ANCHOR_BOTTOM_RIGHT;
    this.defaultOffset = new BMapGL.Size(66, Utils.isDesktop() ? 30 : 90);
  }
  ZoomControl.prototype = new BMapGL.Control();
  ZoomControl.prototype.initialize = function (map) {
    const zoomLevel = map.getZoom();
    const div = document.createElement('div');
    div.className = classnames('sf-map-control-container sf-map-zoom-control-container d-flex align-items-center justify-content-center', {
      'sf-map-control-container-mobile': !Utils.isDesktop()
    });

    const buttonClassName = 'sf-map-control d-flex align-items-center justify-content-center';
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
