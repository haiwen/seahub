const customAvatarOverlay = (point, avatarUrl, bgUrl, width = 20, height = 25) => {
  class AvatarOverlay extends window.BMapGL.Overlay {
    constructor(point, avatarUrl, bgUrl, width, height) {
      super();
      this._point = point;
      this._headerImg = avatarUrl;
      this._bgUrl = bgUrl;
      this._width = width;
      this._height = height;
    }

    initialize(map) {
      this._map = map;
      const divBox = document.createElement('div');
      const divImg = new Image();
      divBox.className = 'custom-avatar-overlay';
      divBox.style.position = 'absolute';
      divBox.style.width = `${this._width}px`;
      divBox.style.height = `${this._height}px`;
      divBox.style.backgroundImage = `url(${this._bgUrl})`;
      divBox.style.backgroundPosition = '.5px 0px';
      divBox.style.display = 'flex';
      divBox.style.padding = '2px 2.5px 0 2px';

      divImg.src = this._headerImg;
      divImg.style.width = '16px';
      divImg.style.height = '16px';
      divImg.style.borderRadius = '50%';
      divImg.style.display = 'block';
      divBox.appendChild(divImg);

      map.getPanes().markerPane.appendChild(divBox);
      this._div = divBox;
      return divBox;
    }

    draw() {
      const position = this._map.pointToOverlayPixel(this._point);
      this._div.style.left = `${position.x - this._width / 2}px`;
      this._div.style.top = `${position.y - (this._height * 7) / 10}px`;
    }
  }

  return new AvatarOverlay(point, avatarUrl, bgUrl, width, height);
};

export default customAvatarOverlay;
