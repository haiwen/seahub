import { gettext } from '../../../../utils/constants';

export const customBMapLabel = (info) => {
  const getLabelContent = (info) => {
    const { location_translated, title, tag } = info;
    const { address } = location_translated;
    const tagContent = Array.isArray(tag) && tag.length > 0 ? tag[0] : '';
    let content = '';
    if (title) {
      content = `
          <div class='selection-label-content' id='selection-label-content'>
            <div class='w-100 d-flex align-items-center'>
              <span class='label-title text-truncate' title=${title}>${title}</span>
              <span class='close-btn' id='selection-label-close'>
                <i class='sf3-font sf3-font-x-01'></i>
              </span>
            </div>
            ${tagContent && `<span class='label-tag'>${tagContent}</span>`}
            <span class='label-address-tip'>${gettext('Address')}</span>
            <span class='label-address text-truncate' title=${address}>${address}</span>
            <div class='label-submit btn btn-primary' id='selection-label-submit'>${gettext('Fill in')}</div>
          </div>
        `;
    } else {
      content = `
        <div class='selection-label-content simple' id='selection-label-content'>
          <div class='w-100 d-flex align-items-center'>
            <span class='label-address text-truncate simple' title=${address}>${address}</span>
            <span class='close-btn' id='selection-label-close'>
              <i class='sf3-font sf3-font-x-01'></i>
            </span>
          </div>
          <div class='label-submit btn btn-primary' id='selection-label-submit'>${gettext('Fill in')}</div>
        </div>
      `;
    }
    return content;
  };

  const content = getLabelContent(info);
  const style = info.title
    ? { transform: 'translateY(-50%, 10%)' }
    : { transform: 'translateY(-50%, 15%)' };
  const label = new window.BMapGL.Label(content, { offset: new window.BMapGL.Size(9, -5) });
  label.setStyle(style);

  return label;
};

export const customGMapLabel = (info) => {
  class Popup extends window.google.maps.OverlayView {
    position;
    containerDiv;
    constructor(position, content) {
      super();
      this.position = position;

      this.containerDiv = document.createElement('div');
      this.containerDiv.classList.add('popup-label-container');
      this.containerDiv.appendChild(content);

      Popup.preventMapHitsAndGesturesFrom(this.containerDiv);
    }
    onAdd() {
      this.getPanes().floatPane.appendChild(this.containerDiv);
    }
    onRemove() {
      if (this.containerDiv.parentElement) {
        this.containerDiv.parentElement.setAttribute('display', 'none');
      }
    }
    setPosition(position) {
      this.position = position;
      this.draw();
    }
    draw() {
      const divPosition = this.getProjection().fromLatLngToDivPixel(
        this.position,
      );
      // Hide the popup when it is far out of view.
      const display =
            Math.abs(divPosition.x) < 4000 && Math.abs(divPosition.y) < 4000
              ? 'block'
              : 'none';

      if (display === 'block') {
        this.containerDiv.style.left = divPosition.x + 'px';
        this.containerDiv.style.top = divPosition.y + 'px';
      }

      if (this.containerDiv.style.display !== display) {
        this.containerDiv.style.display = display;
      }
    }
  }

  return new Popup(info.position, document.getElementById('selection-label-content'));
};
