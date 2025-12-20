import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { gettext } from '../../../utils/constants';
import Lightbox from '@seafile/react-image-lightbox';
import { useMetadataAIOperations } from '../../../hooks';
import EmbeddedFileDetails from '../../dirent-detail/embedded-file-details';
import { SYSTEM_FOLDERS } from '../../../constants';
import { Utils } from '../../../utils/utils';

import '@seafile/react-image-lightbox/style.css';
import './index.css';

const SIDE_PANEL_EXPANDED_WIDTH = 300;

const ImageDialog = ({ repoID, repoInfo, enableRotate: oldEnableRotate = true, imageItems, imageIndex, setImageIndex, closeImagePopup, moveToPrevImage, moveToNextImage, onDeleteImage, onRotateImage, isCustomPermission }) => {
  const [expanded, setExpanded] = useState(false);

  const { enableMetadata, canModify, onOCRByImageDialog } = useMetadataAIOperations();

  const downloadImage = useCallback((url) => {
    location.href = url;
  }, []);

  const onViewOriginal = useCallback(() => {
    window.open(imageItems[imageIndex].url, '_blank');
  }, [imageItems, imageIndex]);

  const onToggleSidePanel = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  const imageItemsLength = imageItems.length;
  if (imageItemsLength === 0) return null;
  const id = imageItems[imageIndex].id;
  const name = imageItems[imageIndex].name;
  const mainImg = imageItems[imageIndex];
  const nextImg = imageItems[(imageIndex + 1) % imageItemsLength];
  const prevImg = imageItems[(imageIndex + imageItemsLength - 1) % imageItemsLength];

  let enableRotate = oldEnableRotate;
  if (enableRotate === true) {
    // The backend server does not support rotating HEIC, GIF, SVG images
    const urlParts = mainImg.src.split('?')[0].split('.');
    const suffix = urlParts[urlParts.length - 1].toLowerCase();
    if (suffix === 'heic' || suffix === 'svg' || suffix === 'gif') {
      enableRotate = false;
    }
    // disable rotate when repo is read-only or encrypted
    else if (repoInfo && (repoInfo.permission === 'r' || repoInfo.encrypted)) {
      enableRotate = false;
    }
    // disable rotate when file is locked
    else if (mainImg.is_locked) {
      enableRotate = false;
    }
  }

  const isSystemFolder = SYSTEM_FOLDERS.find(folderPath => mainImg.parentDir.startsWith(folderPath));
  let onOCR = null;
  if (enableMetadata && canModify && !isSystemFolder) {
    onOCR = () => onOCRByImageDialog({ parentDir: mainImg.parentDir, fileName: mainImg.name }, document.activeElement);
  }

  const renderSidePanel = () => {
    return (
      <div
        className={classNames('lightbox-side-panel', { 'active': expanded })}
        style={{ width: expanded ? SIDE_PANEL_EXPANDED_WIDTH : 0 }}
      >
        {expanded &&
          <EmbeddedFileDetails
            repoID={repoID}
            repoInfo={repoInfo}
            path={mainImg.parentDir}
            dirent={{ id, name, type: 'file' }}
            component={{ headerComponent: { showCloseIcon: true } }}
            setExpanded={setExpanded}
          />
        }
      </div>
    );
  };

  const shortcutMain = Utils.isMac() ? '⌘' : 'Ctrl';

  return (
    <Lightbox
      imageItems={imageItems}
      currentIndex={imageIndex}
      setImageIndex={setImageIndex}
      wrapperClassName='custom-image-previewer'
      imageTitle={`${name} (${imageIndex + 1}/${imageItemsLength})`}
      mainSrc={mainImg.thumbnail || mainImg.src}
      nextSrc={nextImg.thumbnail || nextImg.src}
      prevSrc={prevImg.thumbnail || prevImg.src}
      onCloseRequest={closeImagePopup}
      onMovePrevRequest={moveToPrevImage}
      onMoveNextRequest={moveToNextImage}
      imagePadding={70}
      imageLoadErrorMessage={gettext('The image could not be previewed.')}
      prevLabel={gettext('Previous (Left arrow key)')}
      nextLabel={gettext('Next (Right arrow key)')}
      closeLabel={gettext('Close (Esc)')}
      zoomInLabel={gettext('Zoom in')}
      zoomOutLabel={gettext('Zoom out')}
      metadataLabel={gettext('Metadata')}
      zoomInTip={gettext('Enlarge: Ctrl + Wheel').replace('Ctrl', shortcutMain)}
      zoomOutTip={gettext('Shrink: Ctrl + Wheel').replace('Ctrl', shortcutMain)}
      rotateTip={gettext('Rotate')}
      deleteTip={gettext('Delete')}
      downloadImageTip={gettext('Download')}
      openMetadataTip={gettext('Open metadata')}
      closeMetadataTip={gettext('Close metadata')}
      onClickMetadata={onToggleSidePanel}
      enableRotate={enableRotate}
      onClickDownload={() => downloadImage(imageItems[imageIndex].downloadURL)}
      onClickDelete={onDeleteImage ? () => onDeleteImage(name) : null}
      onViewOriginal={onViewOriginal}
      viewOriginalImageLabel={gettext('View original image')}
      onRotateImage={(onRotateImage && enableRotate) ? (angle) => onRotateImage(imageIndex, angle) : null}
      onOCR={onOCR}
      OCRLabel={gettext('OCR')}
      sidePanel={isCustomPermission ? null : {
        render: renderSidePanel,
        width: expanded ? SIDE_PANEL_EXPANDED_WIDTH : 0,
      }}
    />
  );
};

ImageDialog.propTypes = {
  repoID: PropTypes.string.isRequired,
  repoInfo: PropTypes.object.isRequired,
  imageItems: PropTypes.array.isRequired,
  imageIndex: PropTypes.number.isRequired,
  setImageIndex: PropTypes.func,
  closeImagePopup: PropTypes.func.isRequired,
  moveToPrevImage: PropTypes.func.isRequired,
  moveToNextImage: PropTypes.func.isRequired,
  onDeleteImage: PropTypes.func,
  onRotateImage: PropTypes.func,
  enableRotate: PropTypes.bool,
  isCustomPermission: PropTypes.bool,
};

export default ImageDialog;
