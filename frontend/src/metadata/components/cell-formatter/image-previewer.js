import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { ModalPortal } from '@seafile/sf-metadata-ui-component';
import toaster from '../../../components/toast';
import ImageDialog from '../../../components/dialog/image-dialog';
import imageAPI from '../../../utils/image-api';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import { siteRoot, thumbnailSizeForOriginal, fileServerRoot, thumbnailDefaultSize } from '../../../utils/constants';
import { getFileNameFromRecord, getParentDirFromRecord } from '../../utils/cell';

const ImagePreviewer = (props) => {
  const { record, table, closeImagePopup } = props;
  const [imageIndex, setImageIndex] = useState(0);
  const [imageItems, setImageItems] = useState([]);

  useEffect(() => {
    const repoID = window.sfMetadataContext.getSetting('repoID');
    const repoInfo = window.sfMetadataContext.getSetting('repoInfo');
    const newImageItems = table.rows
      .filter((row) => Utils.imageCheck(getFileNameFromRecord(row)))
      .map((row) => {
        const fileName = getFileNameFromRecord(row);
        const parentDir = getParentDirFromRecord(row);
        const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
        const fileExt = fileName.substr(fileName.lastIndexOf('.') + 1).toLowerCase();
        const isGIF = fileExt === 'gif';
        const useThumbnail = repoInfo?.encrypted;
        const basePath = `${siteRoot}${useThumbnail && !isGIF ? 'thumbnail' : 'repo'}/${repoID}`;
        const src = `${basePath}/${useThumbnail && !isGIF ? thumbnailSizeForOriginal : 'raw'}${path}`;
        return {
          name: fileName,
          url: `${siteRoot}lib/${repoID}/file${path}`,
          thumbnail: `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}`,
          src: src,
          downloadURL: `${fileServerRoot}repos/${repoID}/files${path}/?op=download`,
        };
      });
    setImageItems(newImageItems);
  }, [table]);

  useEffect(() => {
    if (imageItems.length > 0) {
      const index = imageItems.findIndex(item => item.name === getFileNameFromRecord(record));
      if (index > -1) setImageIndex(index);
    }
  }, [imageItems, record]);

  const moveToPrevImage = () => {
    const imageItemsLength = imageItems.length;
    setImageIndex((prevState) => (prevState + imageItemsLength - 1) % imageItemsLength);
  };

  const moveToNextImage = () => {
    const imageItemsLength = imageItems.length;
    setImageIndex((prevState) => (prevState + 1) % imageItemsLength);
  };

  const rotateImage = (imageIndex, angle) => {
    if (imageIndex >= 0 && angle !== 0) {
      const repoID = window.sfMetadataContext.getSetting('repoID');
      const imageItem = imageItems[imageIndex];
      const path = imageItem.url.slice(imageItem.url.indexOf('/file/') + 5);
      imageAPI.rotateImage(repoID, path, 360 - angle).then((res) => {
        if (res.data?.success) {
          seafileAPI.createThumbnail(repoID, path, thumbnailDefaultSize).then((res) => {
            if (res.data?.encoded_thumbnail_src) {
              const cacheBuster = new Date().getTime();
              const newThumbnailSrc = `${res.data.encoded_thumbnail_src}?t=${cacheBuster}`;
              imageItems[imageIndex].src = newThumbnailSrc;
              setImageItems(imageItems);
            }
          }).catch(error => {
            toaster.danger(Utils.getErrorMsg(error));
          });
        }
      }).catch(error => {
        toaster.danger(Utils.getErrorMsg(error));
      });
    }
  };

  return (
    <ModalPortal>
      <ImageDialog
        imageItems={imageItems}
        imageIndex={imageIndex}
        closeImagePopup={closeImagePopup}
        moveToPrevImage={moveToPrevImage}
        moveToNextImage={moveToNextImage}
        onRotateImage={rotateImage}
      />
    </ModalPortal>
  );
};

ImagePreviewer.propTypes = {
  table: PropTypes.object,
  column: PropTypes.object,
  record: PropTypes.object,
  closeImagePopup: PropTypes.func,
};

export default ImagePreviewer;
