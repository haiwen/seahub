import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { ModalPortal } from '@seafile/sf-metadata-ui-component';
import toaster from '../../../components/toast';
import ImageDialog from '../../../components/dialog/image-dialog';
import imageAPI from '../../../utils/image-api';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import { siteRoot, thumbnailSizeForOriginal, fileServerRoot, thumbnailDefaultSize } from '../../../utils/constants';
import { getFileNameFromRecord, getParentDirFromRecord, getRecordIdFromRecord } from '../../utils/cell';

const ImagePreviewer = ({ record, table, repoID, repoInfo, closeImagePopup, deleteRecords }) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [imageItems, setImageItems] = useState([]);

  useEffect(() => {
    const newImageItems = table.rows
      .filter((row) => Utils.imageCheck(getFileNameFromRecord(row)))
      .map((row) => {
        const id = getRecordIdFromRecord(row);
        const fileName = getFileNameFromRecord(row);
        const parentDir = getParentDirFromRecord(row);
        const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
        const fileExt = fileName.substr(fileName.lastIndexOf('.') + 1).toLowerCase();
        const isGIF = fileExt === 'gif';
        const useThumbnail = repoInfo?.encrypted;
        const basePath = `${siteRoot}${useThumbnail && !isGIF ? 'thumbnail' : 'repo'}/${repoID}`;
        const src = `${basePath}/${useThumbnail && !isGIF ? thumbnailSizeForOriginal : 'raw'}${path}`;
        return {
          id,
          name: fileName,
          url: `${siteRoot}lib/${repoID}/file${path}`,
          thumbnail: `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}`,
          src: src,
          parentDir,
          downloadURL: `${fileServerRoot}repos/${repoID}/files${path}/?op=download`,
          rawPath: Utils.joinPath(parentDir, fileName),
        };
      });
    setImageItems(newImageItems);
  }, [table, repoID, repoInfo]);

  useEffect(() => {
    if (imageItems.length > 0) {
      const index = imageItems.findIndex(item => item.id === getRecordIdFromRecord(record));
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
      const path = imageItem.rawPath;
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

  const deleteImage = () => {
    const image = imageItems[imageIndex];
    deleteRecords([image.id]);

    const newImageItems = imageItems.filter(item => item.id !== image.id);
    if (newImageItems.length === 0) {
      setImageIndex(0);
      closeImagePopup();
    } else {
      const newIndex = imageIndex >= newImageItems.length ? 0 : imageIndex;
      setImageIndex(newIndex);
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
        onDeleteImage={deleteImage}
      />
    </ModalPortal>
  );
};

ImagePreviewer.propTypes = {
  record: PropTypes.object,
  table: PropTypes.object,
  repoID: PropTypes.string,
  repoInfo: PropTypes.object,
  closeImagePopup: PropTypes.func,
};

export default ImagePreviewer;
