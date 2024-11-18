import { Utils } from '../../../utils/utils';

const customImageOverlay = (center, imageUrl) => {
  class ImageOverlay extends window.BMap.Overlay {
    constructor(center, imageUrl) {
      super();
      this._center = center;
      this._imageUrl = imageUrl;
    }

    initialize(map) {
      this._map = map;
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.width = '80px';
      div.style.height = '80px';
      div.style.zIndex = 2000;
      map.getPanes().markerPane.appendChild(div);
      this._div = div;

      const imageElement = `<img src=${this._imageUrl} width="72" height="72" />`;
      const htmlString =
        `
          <div class="custom-image-container">
            ${this._imageUrl ? imageElement : '<div class="empty-custom-image-wrapper"></div>'}
            <i class='sf3-font image-overlay-arrow'></i>
          </div>
        `;
      const labelDocument = new DOMParser().parseFromString(htmlString, 'text/html');
      const label = labelDocument.body.firstElementChild;
      this._div.append(label);

      const eventHandler = (event) => {
        event.stopPropagation();
        event.preventDefault();
      };

      if (Utils.isDesktop()) {
        this._div.addEventListener('click', eventHandler);
      } else {
        this._div.addEventListener('touchend', eventHandler);
      }

      return div;
    }

    draw() {
      const position = this._map.pointToOverlayPixel(this._center);
      this._div.style.left = position.x - 40 + 'px'; // 40 is 1/2 container height
      this._div.style.top = position.y - 88 + 'px'; // 80 is container height and 8 is icon height
    }

    getImageUrl() {
      return imageUrl || '';
    }

    getPosition() {
      return center;
    }

    getMap() {
      return this._map || null;
    }
  }

  return new ImageOverlay(center, imageUrl);
};

export default customImageOverlay;
