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

  const zoomInButton = createButton('<svg class="sf-map-control-icon" viewBox="0 0 16 16" width="16" height="16"><path d="M12.4117647,7.4117647 L8.5882353,7.4117647 L8.5882353,3.5882353 C8.5882353,3.23529412 8.35294118,3 8,3 C7.64705882,3 7.4117647,3.23529412 7.4117647,3.5882353 L7.4117647,7.4117647 L3.5882353,7.4117647 C3.23529412,7.4117647 3,7.64705882 3,8 C3,8.35294118 3.23529412,8.5882353 3.5882353,8.5882353 L7.4117647,8.5882353 L7.4117647,12.4117647 C7.4117647,12.7647059 7.64705882,13 8,13 C8.35294118,13 8.5882353,12.7647059 8.5882353,12.4117647 L8.5882353,8.5882353 L12.4117647,8.5882353 C12.7647059,8.5882353 13,8.35294118 13,8 C13,7.64705882 12.7647059,7.4117647 12.4117647,7.4117647 Z" fill="currentColor"></path></svg>');
  const divider = createDivider();
  const zoomOutButton = createButton('<svg class="sf-map-control-icon" viewBox="0 0 16 16" width="16" height="16"><path d="M12.4117647,7.29411764 L8.5882353,7.29411764 L7.4117647,7.29411764 L3.5882353,7.29411764 C3.23529412,7.29411764 3,7.57647059 3,8 C3,8.42352941 3.23529412,8.70588236 3.5882353,8.70588236 L7.4117647,8.70588236 L8.5882353,8.70588236 L12.4117647,8.70588236 C12.7647059,8.70588236 13,8.42352941 13,8 C13,7.57647059 12.7647059,7.29411764 12.4117647,7.29411764 Z" fill="currentColor"></path></svg>');

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

    const zoomInButton = createButton('<svg class="sf-map-control-icon" viewBox="0 0 16 16" width="16" height="16"><path d="M12.4117647,7.4117647 L8.5882353,7.4117647 L8.5882353,3.5882353 C8.5882353,3.23529412 8.35294118,3 8,3 C7.64705882,3 7.4117647,3.23529412 7.4117647,3.5882353 L7.4117647,7.4117647 L3.5882353,7.4117647 C3.23529412,7.4117647 3,7.64705882 3,8 C3,8.35294118 3.23529412,8.5882353 3.5882353,8.5882353 L7.4117647,8.5882353 L7.4117647,12.4117647 C7.4117647,12.7647059 7.64705882,13 8,13 C8.35294118,13 8.5882353,12.7647059 8.5882353,12.4117647 L8.5882353,8.5882353 L12.4117647,8.5882353 C12.7647059,8.5882353 13,8.35294118 13,8 C13,7.64705882 12.7647059,7.4117647 12.4117647,7.4117647 Z" fill="currentColor"></path></svg>');
    const divider = createDivider();
    const zoomOutButton = createButton('<svg class="sf-map-control-icon" viewBox="0 0 16 16" width="16" height="16"><path d="M12.4117647,7.29411764 L8.5882353,7.29411764 L7.4117647,7.29411764 L3.5882353,7.29411764 C3.23529412,7.29411764 3,7.57647059 3,8 C3,8.42352941 3.23529412,8.70588236 3.5882353,8.70588236 L7.4117647,8.70588236 L8.5882353,8.70588236 L12.4117647,8.70588236 C12.7647059,8.70588236 13,8.42352941 13,8 C13,7.57647059 12.7647059,7.29411764 12.4117647,7.29411764 Z" fill="currentColor"></path></svg>');

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
