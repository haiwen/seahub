const customAvatarOverlay = (point, avatarUrl, bgUrl, width = 20, height = 25) => {
  function CircleImgOverlay() {
    this._point = point;
    this._headerImg = avatarUrl;
    this._width = width;
    this._height = height;
  }
  CircleImgOverlay.prototype = new window.BMap.Overlay();
  CircleImgOverlay.prototype.initialize = function (map) {
    this._map = map;
    var divBox = document.createElement('div');
    var divImg = new Image();
    divBox.style.position = 'absolute';
    divBox.style.width = this._width + 'px';
    divBox.style.height = this._height + 'px';
    divBox.style.backgroundImage = `url(${bgUrl})`;
    divBox.style.backgroundPosition = '.5px 0px';
    divBox.style.display = 'flex';
    divBox.style.padding = '2px 2.5px 0 2px';

    divImg.src = this._headerImg;
    divImg.style.width = '16px';
    divImg.style.height = '16px';
    divImg.style.borderRadius = '50%';
    divImg.style.display = 'block';
    divBox.appendChild(divImg);
    // Add the div to the overlay container.
    map.getPanes().markerPane.appendChild(divBox);
    this._div = divBox;
    // The div element needs to be returned as the method's result. When the show,
    // hide methods are called or when the overlay is removed, the API will operate on this element.。
    return divBox;
  };

  CircleImgOverlay.prototype.draw = function draw() {
    var position = this._map.pointToOverlayPixel(this._point);
    this._div.style.left = position.x - this._width / 2 + 'px';
    this._div.style.top = position.y - (this._height * 7) / 10 + 'px';
  };

  return new CircleImgOverlay();
};

export default customAvatarOverlay;
