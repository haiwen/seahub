import { Utils } from '../../../utils/utils';

const customImageOverlay = (center, imageUrl) => {
  function ImageOverlay() {
    this._center = center;
    this._imgUrl = imageUrl;
  }

  ImageOverlay.prototype = new window.BMap.Overlay();

  ImageOverlay.prototype.initialize = function (map) {
    this._map = map;
    let div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.width = '80px';
    div.style.height = '80px';
    div.style.zIndex = 2000;
    map.getPanes().markerPane.appendChild(div);
    this._div = div;

    const imageElement = `<img src=${imageUrl} width="72" height="72" />`;
    const htmlString = `
      <div class="custom-image-container">
        ${imageUrl ? imageElement : '<div class="empty-custom-image-wrapper"></div>'}
        <i class='sf3-font image-overlay-arrow'></i>
      </div>
    `;
    const labelDocument = new DOMParser().parseFromString(htmlString, 'text/html');
    const label = labelDocument.body.firstElementChild;
    this._div.append(label);
    if (Utils.isDesktop) {
      this._div.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
      });
    } else {
      this._div.addEventListener('touchend', (event) => {
        event.stopPropagation();
        event.preventDefault();
      });
    }
    return div;
  };

  ImageOverlay.prototype.draw = function () {
    const position = this._map.pointToOverlayPixel(this._center);
    this._div.style.left = position.x - 40 + 'px'; // 40 is 1/2 container height
    this._div.style.top = position.y - 88 + 'px'; // 80 is container height and 8 is icon height
  };

  ImageOverlay.prototype.getImageUrl = function () {
    return imageUrl || '';
  };

  ImageOverlay.prototype.getPosition = function () {
    return center;
  };

  ImageOverlay.prototype.getMap = function () {
    return this._map || null;
  };

  return new ImageOverlay(center);
};

export default customImageOverlay;
