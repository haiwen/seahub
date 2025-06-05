const OVERLAY_SIZE = 80;

const customImageOverlay = (props) => {
  const { isCluster, pointCount, reduces, className } = props;
  const src = isCluster ? reduces.src : props.src;

  const div = document.createElement('div');
  div.className = className;
  div.style.position = 'absolute';

  const container = document.createElement('div');
  container.className = 'custom-image-container';

  if (isCluster && pointCount > 1) {
    const customImageNumber = document.createElement('span');
    customImageNumber.className = 'custom-image-number';
    customImageNumber.innerText = pointCount < 1000 ? pointCount : '1k+';
    container.appendChild(customImageNumber);
  }

  if (src) {
    const imageElement = document.createElement('img');
    imageElement.src = src;
    imageElement.width = OVERLAY_SIZE;
    imageElement.height = OVERLAY_SIZE;
    container.appendChild(imageElement);
  } else {
    const emptyImageWrapper = document.createElement('div');
    emptyImageWrapper.className = 'empty-custom-image-wrapper';
    container.appendChild(emptyImageWrapper);
  }

  div.appendChild(container);
  return div;
};

export default customImageOverlay;
