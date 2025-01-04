import styles from './SlideCaptcha.css';

const width = 310;
const height = 155;
const square = 50;

function createCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function createImg(onload) {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = onload;

  img.setSrc = function (src) {
    img.src = src;
  }

  img.setSrc(getRandomImgSrc());
  return img;
}

function createElement(tagName, className) {
  const element = document.createElement(tagName);
  className && (element.className = styles[className]);
  return element;
}

function setClass(element, className) {
  element.className = styles[className];
}

function addClass(element, className) {
  element.classList.add(styles[className]);
}

function removeClass(element, className) {
  element.classList.remove(styles[className]);
}

function getRandomImgSrc() {
  let url = "/api/v2.1/slide-captcha/";
  let xhr = new XMLHttpRequest();
  xhr.open("GET", url, false);
  xhr.send(null);
  let text = xhr.responseText;
  return 'data:image/jpeg;base64,' + text;
}

function sumFunc(x, y) {
  return x + y;
}

function squareFunc(x) {
  return x * x;
}

class SlideCaptcha {
  constructor({ el, onSuccess, onFail, onRefresh }) {
    Object.assign(el.style, {
      position: 'relative',
      width: width + 'px',
      margin: '0 auto'
    })
    this.el = el;
    this.onSuccess = onSuccess;
    this.onFail = onFail;
    this.onRefresh = onRefresh;

    this.srcY = 0;
    this.moveX = 0;
  }

  init() {
    this.initDOM();
    this.initImg();
    this.bindEvents();
  }

  initDOM() {
    const src = createCanvas(width, height + height);
    src.style.display = "none";
    const canvas = createCanvas(width, height);
    const block = createCanvas(width, height);
    setClass(block, 'block');
    const sliderContainer = createElement('div', 'sliderContainer');
    sliderContainer.style.width = width + 'px';
    sliderContainer.style.pointerEvents = 'none';
    const refreshIcon = createElement('div', 'refreshIcon');
    const sliderMask = createElement('div', 'sliderMask');
    const slider = createElement('div', 'slider');
    const sliderIcon = createElement('span', 'sliderIcon');
    const text = createElement('span', 'sliderText');
    text.innerHTML = '向右滑动填充拼图';

    const loadingContainer = createElement('div', 'loadingContainer');
    loadingContainer.style.width = width + 'px';
    loadingContainer.style.height = height + 'px';
    const loadingIcon = createElement('div', 'loadingIcon');
    const loadingText = createElement('span');
    loadingText.innerHTML = '加载中...';
    loadingContainer.appendChild(loadingIcon);
    loadingContainer.appendChild(loadingText);

    const el = this.el;
    el.appendChild(loadingContainer);
    el.appendChild(src);
    el.appendChild(canvas);
    el.appendChild(refreshIcon);
    el.appendChild(block);
    slider.appendChild(sliderIcon);
    sliderMask.appendChild(slider);
    sliderContainer.appendChild(sliderMask);
    sliderContainer.appendChild(text);
    el.appendChild(sliderContainer);

    Object.assign(this, {
      canvas,
      block,
      sliderContainer,
      loadingContainer,
      refreshIcon,
      slider,
      sliderMask,
      sliderIcon,
      text,
      srcCtx: canvas.getContext('2d'),
      canvasCtx: canvas.getContext('2d'),
      blockCtx: block.getContext('2d')
    })
  }

  setLoading(isLoading) {
    this.loadingContainer.style.display = isLoading ? '' : 'none';
    this.sliderContainer.style.pointerEvents = isLoading ? 'none' : '';
  }

  initImg() {
    const img = createImg(() => {
      this.setLoading(false);
      this.draw(img);
    })
    this.img = img;
  }

  draw(img) {
    this.srcCtx.drawImage(img, 0, 0, img.width, img.height);
    // crop
    let blockImage = this.srcCtx.getImageData(0, height, square, square);
    let canvasImage = this.srcCtx.getImageData(0, 0, width, height);

    //paste
    const srcHeight = img.height;
    const srcY = srcHeight - height - square;
    this.srcY = srcY;
    this.canvasCtx.putImageData(canvasImage, 0, 0);
    this.blockCtx.putImageData(blockImage, 0, srcY);

    // block border
    this.blockCtx.beginPath();
    this.blockCtx.moveTo(0, srcY);
    this.blockCtx.lineTo(0, srcY + square);
    this.blockCtx.lineTo(square, srcY + square);
    this.blockCtx.lineTo(square, srcY);
    this.blockCtx.lineTo(0, srcY);
    this.blockCtx.lineWidth = 2;
    this.blockCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    this.blockCtx.stroke();
  }

  bindEvents() {
    this.el.onselectstart = () => false;
    this.refreshIcon.onclick = () => {
      this.reset();
      typeof this.onRefresh === 'function' && this.onRefresh();
    }

    let originX, originY, trail = [], isMouseDown = false;

    const handleDragStart = function (e) {
      originX = e.clientX || e.touches[0].clientX;
      originY = e.clientY || e.touches[0].clientY;
      isMouseDown = true;
    }
    const handleDragMove = (e) => {
      if (!isMouseDown) return false;
      e.preventDefault();
      const eventX = e.clientX || e.touches[0].clientX;
      const eventY = e.clientY || e.touches[0].clientY;
      const moveX = eventX - originX;
      const moveY = eventY - originY;
      if (moveX < 0 || moveX + square >= width) return false;
      this.slider.style.left = moveX + 'px';
      this.block.style.left = moveX + 'px';

      addClass(this.sliderContainer, 'sliderContainer_active');
      this.sliderMask.style.width = moveX + 'px';
      this.moveX = moveX;
      trail.push(moveY);
    }

    const handleDragEnd = (e) => {
      if (!isMouseDown) return false;
      isMouseDown = false;
      const eventX = e.clientX || e.changedTouches[0].clientX;
      if (eventX === originX) return false;
      removeClass(this.sliderContainer, 'sliderContainer_active');
      this.trail = trail;
      const { spliced, verified } = this.verify();
      if (spliced) {
        if (verified) {
          addClass(this.sliderContainer, 'sliderContainer_success');
          typeof this.onSuccess === 'function' && this.onSuccess();
        } else {
          addClass(this.sliderContainer, 'sliderContainer_fail');
          this.text.innerHTML = '请再试一次';
          this.reset();
        }
      } else {
        addClass(this.sliderContainer, 'sliderContainer_fail');
        typeof this.onFail === 'function' && this.onFail();
        setTimeout(this.reset.bind(this), 1000);
      }
    }
    this.slider.addEventListener('mousedown', handleDragStart);
    this.slider.addEventListener('touchstart', handleDragStart);
    this.block.addEventListener('mousedown', handleDragStart);
    this.block.addEventListener('touchstart', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);
  }

  verify() {
    const arr = this.trail;
    const average = arr.reduce(sumFunc) / arr.length;
    const deviations = arr.map(x => x - average);
    const stddev = Math.sqrt(deviations.map(squareFunc).reduce(sumFunc) / arr.length);

    let url = "/api/v2.1/slide-captcha/";
    let xhr = new XMLHttpRequest();
    xhr.open("POST", url, false);
    xhr.setRequestHeader("Content-Type", "application/json")
    xhr.send(JSON.stringify({ "x": this.moveX, "y": this.srcY }));
    let status = xhr.status;
    return {
      spliced: status === 200,
      verified: stddev !== 0,
    }
  }

  reset() {
    setClass(this.sliderContainer, 'sliderContainer');
    this.slider.style.left = 0 + 'px';
    this.block.width = width;
    this.block.style.left = 0 + 'px';
    this.sliderMask.style.width = 0 + 'px';

    this.srcCtx.clearRect(0, 0, width, height + height);
    this.canvasCtx.clearRect(0, 0, width, height);
    this.blockCtx.clearRect(0, 0, width, height);

    this.srcY = 0;
    this.moveX = 0;

    this.setLoading(true);
    this.img.setSrc(getRandomImgSrc());
  }
}

window.SlideCaptcha = {
  init: function (opts) {
    return new SlideCaptcha(opts).init();
  }
}
