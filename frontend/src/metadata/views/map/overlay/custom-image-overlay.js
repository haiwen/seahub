import { Utils } from '../../../../utils/utils';

const customImageOverlay = (center, image, callback) => {
  class ImageOverlay extends window.BMapLib.TextIconOverlay {
    constructor(center, image, { callback } = {}) {
      super(center, '', { styles: [] });
      this._center = center;
      this._imageUrl = image.src;
      this._imageId = image.id;
      this._callback = callback;
    }

    initialize(map) {
      this._map = map;
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.zIndex = 2000;
      map.getPanes().markerPane.appendChild(div);
      this._div = div;

      const imageElement = `<img src=${this._imageUrl} />`;
      const htmlString =
        `
          <div class="custom-image-container">
            ${this._imageUrl ? imageElement : '<div class="empty-custom-image-wrapper"></div>'}
          </div>
        `;
      const labelDocument = new DOMParser().parseFromString(htmlString, 'text/html');
      const label = labelDocument.body.firstElementChild;
      this._div.append(label);

      const eventHandler = (event) => {
        event.stopPropagation();
        event.preventDefault();
        this._callback && this._callback(event, [{ _imageId: this._imageId }]);
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
      return image.src || '';
    }

    getPosition() {
      return center;
    }

    getMap() {
      return this._map || null;
    }
  }

  return new ImageOverlay(center, image, callback);
};

export default customImageOverlay;
