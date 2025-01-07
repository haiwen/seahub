import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../utils/constants';
import Lightbox from '@seafile/react-image-lightbox';
import { useMetadataAIOperations } from '../../../hooks/metadata-ai-operation';
import { SYSTEM_FOLDERS } from '../../../constants';
import { Utils } from '../../../utils/utils';
import { Dirent } from '../../../models';
import { seafileAPI } from '../../../utils/seafile-api';
import SidePanel from './side-panel';

import '@seafile/react-image-lightbox/style.css';

const ImageDialog = ({ repoID, repoInfo, enableRotate: oldEnableRotate, imageItems, imageIndex, closeImagePopup, moveToPrevImage, moveToNextImage, onDeleteImage, onRotateImage, onFileTagChanged }) => {
  const [direntDetail, setDirentDetail] = useState(null);
  const { enableOCR, enableMetadata, canModify, onOCR: onOCRAPI, OCRSuccessCallBack } = useMetadataAIOperations();

  useEffect(() => {
    const getDirentDetail = async (repoID, path) => {
      try {
        const res = await seafileAPI.getFileInfo(repoID, path);
        return res.data;
      } catch (error) {
        return null;
      }
    };

    const path = Utils.joinPath(imageItems[imageIndex].parentDir, imageItems[imageIndex].name);
    getDirentDetail(repoID, path).then(res => {
      setDirentDetail(res);
    });
  }, [imageIndex, imageItems, repoID]);

  const downloadImage = useCallback((url) => {
    location.href = url;
  }, []);

  const onViewOriginal = useCallback(() => {
    window.open(imageItems[imageIndex].url, '_blank');
  }, [imageItems, imageIndex]);

  const imageItemsLength = imageItems.length;
  if (imageItemsLength === 0) return null;
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
    const dirent = new Dirent({ name, type: 'file' });
    const path = Utils.joinPath(mainImg.parentDir, mainImg.name);

    return <SidePanel repoID={repoID} repoInfo={repoInfo} path={path} dirent={dirent} direntDetail={direntDetail} onFileTagChanged={onFileTagChanged} />;
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
      onRenderSidePanel={renderSidePanel}
    />
  );
};

ImageDialog.propTypes = {
  repoID: PropTypes.string,
  imageItems: PropTypes.array.isRequired,
  imageIndex: PropTypes.number.isRequired,
  closeImagePopup: PropTypes.func.isRequired,
  moveToPrevImage: PropTypes.func.isRequired,
  moveToNextImage: PropTypes.func.isRequired,
  onDeleteImage: PropTypes.func,
  onRotateImage: PropTypes.func,
  enableRotate: PropTypes.bool,
  onFileTagChanged: PropTypes.func,
};

ImageDialog.defaultProps = {
  enableRotate: true,
};

export default ImageDialog;
