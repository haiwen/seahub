import Icon from '../../../../components/icon';
import { gettext } from '../../../../utils/constants';

const generateLabelContent = (info, isBMap = false) => {
  const { location_translated, title, tag } = info;
  const { address } = location_translated;
  const tagContent = Array.isArray(tag) && tag.length > 0 ? tag[0] : '';

  const icon = <Icon symbol="x-01" />;
  if (isBMap) {
    return `
      <div
        class='${title ? 'selection-label-content' : 'selection-label-content simple'}'
        id='selection-label-content'
      >
        ${`
          <div class="w-100 d-flex align-items-center">
            ${title ? `
              <span class="label-title text-truncate" title="${title}">${title}</span>
              <span class="close-btn" id="selection-label-close">
                ${icon}
              </span>
            ` : `
              <span class="label-address text-truncate simple" title="${address}">${address}</span>
              <span class="close-btn" id="selection-label-close">
                ${icon}
              </span>
            `}
          </div>
        ${title ? `
          ${tagContent ? `<span class="label-tag">${tagContent}</span>` : ''}
          <span class="label-address-tip">${gettext('Address')}</span>
          <span class="label-address text-truncate" title="${address}">${address}</span>
        ` : ''}
        <div class="label-submit btn btn-primary" id="selection-label-submit">${gettext('Fill in')}</div>
    `}
      </div>
    `;
  } else {
    const container = document.createElement('div');
    container.className = title ? 'selection-label-content' : 'selection-label-content simple';
    container.id = 'selection-label-content';

    const content = `
    <div class="w-100 d-flex align-items-center">
      ${title ? `
        <span class="label-title text-truncate" title="${title}">${title}</span>
        <span class="close-btn" id="selection-label-close">
          ${icon}
        </span>
      ` : `
        <span class="label-address text-truncate simple" title="${address}">${address}</span>
        <span class="close-btn" id="selection-label-close">
          ${icon}
        </span>
      `}
    </div>
    ${title ? `
      ${tagContent ? `<span class="label-tag">${tagContent}</span>` : ''}
      <span class="label-address-tip">${gettext('Address')}</span>
      <span class="label-address text-truncate" title="${address}">${address}</span>
    ` : ''}
    <div class="label-submit btn btn-primary" id="selection-label-submit">${gettext('Fill in')}</div>
  `;

    container.innerHTML = content;
    return container;
  }
};

export const customBMapLabel = (info) => {
  const content = generateLabelContent(info, true);
  const label = new window.BMapGL.Label(content, { offset: new window.BMapGL.Size(9, -5) });
  const style = info.title
    ? { transform: 'translateY(-50%, 10%)' }
    : { transform: 'translateY(-50%, 15%)' };
  label.setStyle(style);

  return label;
};

export const customGMapLabel = (info, submit) => {
  class Popup extends window.google.maps.OverlayView {
    constructor(position, content) {
      super();
      this.position = position;
      this.info = info;
      this.containerDiv = document.createElement('div');
      this.containerDiv.classList.add('popup-label-container');
      this.containerDiv.appendChild(content);

      const closeBtn = this.containerDiv.querySelector('#selection-label-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onRemove();
        });
      }

      const submitBtn = this.containerDiv.querySelector('#selection-label-submit');
      if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          submit(info);
        });
      }

      Popup.preventMapHitsAndGesturesFrom(this.containerDiv);
    }
    onAdd() {
      this.getPanes().floatPane.appendChild(this.containerDiv);
    }
    onRemove() {
      if (this.containerDiv.parentElement) {
        this.containerDiv.parentElement.removeChild(this.containerDiv);
      }
    }
    setPosition(position) {
      this.position = position;
      this.draw();
    }
    setInfo(info) {
      this.info = info;
      this.containerDiv.innerHTML = generateLabelContent(info, true);
      const closeBtn = this.containerDiv.querySelector('#selection-label-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onRemove();
        });
      }
      const submitBtn = this.containerDiv.querySelector('#selection-label-submit');
      if (submitBtn) {
        submitBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          submit(info);
        });
      }
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

  const content = generateLabelContent(info);
  return new Popup(info.position, content);
};
