import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import Lightbox from '@seafile/react-image-lightbox';
import { useMetadataAIOperations } from '../../../hooks/metadata-ai-operation';
import { SYSTEM_FOLDERS } from '../../../constants';
import EmbeddedFileDetails from '../../dirent-detail/embedded-file-details';
import { Utils } from '../../../utils/utils';
import Icon from '../../icon';
import { metadataAPI } from '../../../metadata';
import toaster from '../../toast';

import '@seafile/react-image-lightbox/style.css';
import './index.css';

const SIDE_PANEL_COLLAPSED_WIDTH = 10;
const SIDE_PANEL_EXPANDED_WIDTH = 300;

const ImageDialog = ({ repoID, repoInfo, enableRotate: oldEnableRotate, imageItems, imageIndex, closeImagePopup, moveToPrevImage, moveToNextImage, onDeleteImage, onRotateImage, isCustomPermission }) => {
  const [expanded, setExpanded] = useState(false);
  const [enableFaceRecognition, setEnableFaceRecognition] = useState(false);

  const { enableOCR, enableMetadata, canModify, onOCR: onOCRAPI, OCRSuccessCallBack } = useMetadataAIOperations();

  const downloadImage = useCallback((url) => {
    location.href = url;
  }, []);

  const onViewOriginal = useCallback(() => {
    window.open(imageItems[imageIndex].url, '_blank');
  }, [imageItems, imageIndex]);

  const onToggleSidePanel = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  useEffect(() => {
    metadataAPI.getFaceRecognitionStatus(repoID).then(res => {
      setEnableFaceRecognition(res.data.enabled);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID]);

  const imageItemsLength = imageItems.length;
  if (imageItemsLength === 0) return null;
  const id = imageItems[imageIndex].id;
  const name = imageItems[imageIndex].name;
  const mainImg = imageItems[imageIndex];
  const nextImg = imageItems[(imageIndex + 1) % imageItemsLength];
  const prevImg = imageItems[(imageIndex + imageItemsLength - 1) % imageItemsLength];

  // The backend server does not support rotating HEIC images
  let enableRotate = oldEnableRotate;
  const suffix = mainImg.src.slice(mainImg.src.lastIndexOf('.') + 1, mainImg.src.lastIndexOf('?')).toLowerCase();
  if (suffix === 'heic') {
    enableRotate = false;
  }

  const isSystemFolder = SYSTEM_FOLDERS.find(folderPath => mainImg.parentDir.startsWith(folderPath));
  let onOCR = null;
  if (enableOCR && enableMetadata && canModify && !isSystemFolder) {
    onOCR = () => onOCRAPI({ parentDir: mainImg.parentDir, fileName: mainImg.name }, { success_callback: OCRSuccessCallBack });
  }

  const renderSidePanel = () => {
    const dirent = { id, name, type: 'file' };
    const path = Utils.joinPath(mainImg.parentDir, name);

    return (
      <div
        className="lightbox-side-panel"
        style={{ width: expanded ? SIDE_PANEL_EXPANDED_WIDTH : SIDE_PANEL_COLLAPSED_WIDTH }}
        aria-expanded={expanded}
      >
        <div className="side-panel-controller" onClick={onToggleSidePanel}>
          <Icon className="expand-button" symbol={expanded ? 'right_arrow' : 'left_arrow'} />
        </div>
        {expanded && (
          <EmbeddedFileDetails
            repoID={repoID}
            repoInfo={repoInfo}
            path={path}
            dirent={dirent}
            onClose={() => {}}
            component={{
              headerComponent: {
                isShowControl: false,
              }
            }}
            enableFaceRecognition={enableFaceRecognition}
          />
        )}
      </div>

    );
  };

  return (
    <Lightbox
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
      enableRotate={enableRotate}
      onClickDownload={() => downloadImage(imageItems[imageIndex].downloadURL)}
      onClickDelete={onDeleteImage ? () => onDeleteImage(name) : null}
      onViewOriginal={onViewOriginal}
      viewOriginalImageLabel={gettext('View original image')}
      onRotateImage={(onRotateImage && enableRotate) ? (angle) => onRotateImage(imageIndex, angle) : null}
      onOCR={onOCR}
      OCRLabel={gettext('OCR')}
      sidePanel={!isCustomPermission ? {
        render: renderSidePanel,
        width: expanded ? SIDE_PANEL_EXPANDED_WIDTH : SIDE_PANEL_COLLAPSED_WIDTH,
      } : null}
    />
  );
};

ImageDialog.propTypes = {
  repoID: PropTypes.string.isRequired,
  repoInfo: PropTypes.object.isRequired,
  imageItems: PropTypes.array.isRequired,
  imageIndex: PropTypes.number.isRequired,
  closeImagePopup: PropTypes.func.isRequired,
  moveToPrevImage: PropTypes.func.isRequired,
  moveToNextImage: PropTypes.func.isRequired,
  onDeleteImage: PropTypes.func,
  onRotateImage: PropTypes.func,
  enableRotate: PropTypes.bool,
  isCustomPermission: PropTypes.bool,
};

ImageDialog.defaultProps = {
  enableRotate: true,
  isCustomPermission: false,
};

export default ImageDialog;
