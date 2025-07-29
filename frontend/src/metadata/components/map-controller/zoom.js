import classnames from 'classnames';
import { Utils } from '../../../utils/utils';
import { MIN_ZOOM, MAX_ZOOM } from '../../constants/view/map';

const buttonClassName = 'sf-map-control sf-map-zoom-control d-flex align-items-center justify-content-center';

const createZoomContainer = () => {
  const container = document.createElement('div');
  container.className = classnames(
    'sf-map-control-container sf-map-zoom-control-container d-flex align-items-center justify-content-center',
    { 'sf-map-control-container-mobile': !Utils.isDesktop() }
  );
  return container;
};

const createButton = (innerHTML) => {
  const button = document.createElement('div');
  button.className = 'sf-map-control sf-map-zoom-control d-flex align-items-center justify-content-center';
  button.innerHTML = innerHTML;
  return button;
};

const createDivider = () => {
  const divider = document.createElement('div');
  divider.className = 'sf-map-control-divider';
  return divider;
};

const updateButtonStates = (map, zoomIn, zoomOut) => {
  const zoomLevel = map.getZoom();
  zoomIn.className = classnames(buttonClassName, { 'disabled': zoomLevel >= MAX_ZOOM });
  zoomOut.className = classnames(buttonClassName, { 'disabled': zoomLevel <= MIN_ZOOM });
};

export const createZoomControl = ({ map }) => {
  const container = createZoomContainer();

  const zoomInButton = createButton('<i class="sf-map-control-icon sf3-font sf3-font-zoom-in"></i>');
  const divider = createDivider();
  const zoomOutButton = createButton('<i class="sf-map-control-icon sf3-font sf3-font-zoom-out"></i>');

  container.appendChild(zoomInButton);
  container.appendChild(divider);
  container.appendChild(zoomOutButton);

  zoomInButton.addEventListener('click', (e) => {
    e.preventDefault();
    const nextZoom = Math.min(map.getZoom() + 1, MAX_ZOOM);
    map.setZoom(nextZoom);
  });

  zoomOutButton.addEventListener('click', (e) => {
    e.preventDefault();
    const nextZoom = Math.max(map.getZoom() - 1, MIN_ZOOM);
    map.setZoom(nextZoom);
  });

  map.addListener('zoom_changed', () => updateButtonStates(map, zoomInButton, zoomOutButton));

  return container;
};

export function createBMapZoomControl({ anchor, offset }) {
  function ZoomControl() {
    this.defaultAnchor = anchor || window.BMAP_ANCHOR_BOTTOM_RIGHT;
    this.defaultOffset = new window.BMapGL.Size(offset?.x || 66, offset?.y || 30);
  }
  ZoomControl.prototype = new window.BMapGL.Control();
  ZoomControl.prototype.initialize = function (map) {
    const container = createZoomContainer();

    const zoomInButton = createButton('<i class="sf-map-control-icon sf3-font sf3-font-zoom-in"></i>');
    const divider = createDivider();
    const zoomOutButton = createButton('<i class="sf-map-control-icon sf3-font sf3-font-zoom-out"></i>');

    container.appendChild(zoomInButton);
    container.appendChild(divider);
    container.appendChild(zoomOutButton);

    zoomInButton.onclick = (e) => {
      e.preventDefault();
      const nextZoom = map.getZoom() + 1;
      map.zoomTo(Math.min(nextZoom, MAX_ZOOM));
    };

    zoomOutButton.onclick = (e) => {
      e.preventDefault();
      const nextZoom = map.getZoom() - 1;
      map.zoomTo(Math.max(nextZoom, MIN_ZOOM));
    };

    map.addEventListener('zoomend', () => updateButtonStates(map, zoomInButton, zoomOutButton));
    map.getContainer().appendChild(container);
    return container;
  };

  return ZoomControl;
}
