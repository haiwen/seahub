import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import toaster from '../../../components/toast';
import ImageDialog from '../../../components/dialog/image-dialog';
import imageAPI from '../../../utils/image-api';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import { siteRoot, thumbnailSizeForOriginal, fileServerRoot, thumbnailDefaultSize } from '../../../utils/constants';
import { getFileNameFromRecord, getParentDirFromRecord, getRecordIdFromRecord, getFileMTimeFromRecord } from '../../utils/cell';

const ImagePreviewer = ({ record, table, repoID, repoInfo, closeImagePopup, deleteRecords, canDelete, onChangePosition }) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [imageItems, setImageItems] = useState([]);

  useEffect(() => {
    const newImageItems = table.rows
      .filter((row) => Utils.imageCheck(getFileNameFromRecord(row)))
      .map((row) => {
        const id = getRecordIdFromRecord(row);
        const mtime = getFileMTimeFromRecord(row);
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
          thumbnail: `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}?mtime=${mtime}`,
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
    const newIndex = (imageIndex + imageItemsLength - 1) % imageItemsLength;
    setImageIndex(newIndex);

    // update selected cell in table
    const recordId = imageItems[newIndex].id;
    const rowIdx = table.rows.findIndex(row => getRecordIdFromRecord(row) === recordId);
    if (rowIdx !== -1) {
      onChangePosition && onChangePosition(rowIdx, true);
    }
  };

  const moveToNextImage = () => {
    const imageItemsLength = imageItems.length;
    const newIndex = (imageIndex + 1) % imageItemsLength;
    setImageIndex(newIndex);

    // update selected cell in table
    const recordId = imageItems[newIndex].id;
    const rowIdx = table.rows.findIndex(row => getRecordIdFromRecord(row) === recordId);
    if (rowIdx !== -1) {
      onChangePosition && onChangePosition(rowIdx, true);
    }
  };

  const rotateImage = (imageIndex, angle) => {
    if (imageIndex >= 0 && angle !== 0) {
      const imageItem = imageItems[imageIndex];
      const path = imageItem.rawPath;
      imageAPI.rotateImage(repoID, path, 360 - angle).then((res) => {
        if (res.data?.success) {
          seafileAPI.createThumbnail(repoID, path, thumbnailDefaultSize).then((res) => {
            if (res.data?.encoded_thumbnail_src) {
              const cacheBuster = new Date().getTime();
              const newThumbnailSrc = `${res.data.encoded_thumbnail_src}?t=${cacheBuster}`;
              imageItems[imageIndex].thumbnail = newThumbnailSrc;
              setImageItems(imageItems);
              table.rows.forEach(row => {
                if (row.id === imageItem.id) {
                  row._mtime = new Date().toISOString();
                }
              });
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
    <ImageDialog
      repoID={repoID}
      repoInfo={repoInfo}
      imageItems={imageItems}
      imageIndex={imageIndex}
      setImageIndex={index => this.setImageIndex(index)}
      closeImagePopup={closeImagePopup}
      moveToPrevImage={moveToPrevImage}
      moveToNextImage={moveToNextImage}
      onRotateImage={rotateImage}
      onDeleteImage={canDelete ? deleteImage : null}
    />
  );
};

ImagePreviewer.propTypes = {
  record: PropTypes.object,
  table: PropTypes.object,
  repoID: PropTypes.string,
  repoInfo: PropTypes.object,
  closeImagePopup: PropTypes.func,
  deleteRecords: PropTypes.func,
  canDelete: PropTypes.bool,
  onChangePosition: PropTypes.func,
};

export default ImagePreviewer;
