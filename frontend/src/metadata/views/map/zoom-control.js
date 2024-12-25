import { Utils } from '../../../utils/utils';

export function createBMapZoomControl(BMap, callback) {
  function ZoomControl() {
    this.defaultAnchor = window.BMAP_ANCHOR_BOTTOM_RIGHT;
    this.defaultOffset = new BMap.Size(80, Utils.isDesktop() ? 30 : 90);
  }
  ZoomControl.prototype = new window.BMap.Control();
  ZoomControl.prototype.initialize = function (map) {
    const div = document.createElement('div');
    div.className = 'sf-BMap-zoom-control';
    div.style = 'display: flex; justify-content: center; align-items: center;';

    const zoomInButton = document.createElement('button');
    zoomInButton.className = 'sf-BMap-zoom-button';
    zoomInButton.style = 'display: flex; justify-content: center; align-items: center;';
    zoomInButton.innerHTML = '<svg class="zoom-in-icon"><use xlink:href="#plus_sign" /></svg>';
    div.appendChild(zoomInButton);

    const divider = document.createElement('div');
    divider.style = 'height: 22px; width: 1px; background-color: #ccc;';
    div.appendChild(divider);

    const zoomOutButton = document.createElement('button');
    zoomOutButton.className = 'sf-BMap-zoom-button';
    zoomOutButton.style = 'display: flex; justify-content: center; align-items: center;';
    zoomOutButton.innerHTML = '<svg class="zoom-out-icon"><use xlink:href="#minus_sign" /></svg>';
    div.appendChild(zoomOutButton);

    if (Utils.isDesktop()) {
      setNodeStyle(div, 'height: 40px; width: 111px; line-height: 40px');
    } else {
      setNodeStyle(div, 'height: 35px; width: 80px; line-height: 35px; opacity: 0.75');
    }

    const updateButtonStates = () => {
      const zoomLevel = map.getZoom();
      const maxZoom = map.getMaxZoom();
      const minZoom = map.getMinZoom();

      zoomInButton.disabled = zoomLevel >= maxZoom;
      zoomOutButton.disabled = zoomLevel <= minZoom;
    };

    zoomInButton.onclick = (e) => {
      e.preventDefault();
      map.zoomTo(map.getZoom() + 2);
    };

    zoomOutButton.onclick = (e) => {
      e.preventDefault();
      map.zoomTo(map.getZoom() - 2);
    };

    map.addEventListener('zoomend', updateButtonStates);
    map.getContainer().appendChild(div);
    return div;
  };

  return ZoomControl;
}

function setNodeStyle(dom, styleText) {
  dom.style.cssText += styleText;
}
