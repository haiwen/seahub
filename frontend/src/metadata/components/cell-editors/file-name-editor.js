import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { ModalPortal } from '@seafile/sf-metadata-ui-component';
import { Utils } from '../../../utils/utils';
import ImageDialog from '../../../components/dialog/image-dialog';
import { siteRoot, thumbnailSizeForOriginal, fileServerRoot, thumbnailDefaultSize } from '../../../utils/constants';
import { PRIVATE_COLUMN_KEY } from '../../constants';
import imageAPI from '../../../utils/image-api';
import { seafileAPI } from '../../../utils/seafile-api';
import toaster from '../../../components/toast';

const FileNameEditor = ({ column, record, table, onCommitCancel }) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [imageItems, setImageItems] = useState([]);

  useEffect(() => {
    const repoID = window.sfMetadataContext.getSetting('repoID');
    const repoInfo = window.sfMetadataContext.getSetting('repoInfo');
    const newImageItems = table.rows
      .filter(row => Utils.imageCheck(row[PRIVATE_COLUMN_KEY.FILE_NAME]))
      .map(item => {
        const fileName = item[PRIVATE_COLUMN_KEY.FILE_NAME];
        const parentDir = item[PRIVATE_COLUMN_KEY.PARENT_DIR];
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
      const index = imageItems.findIndex(item => item.name === record[PRIVATE_COLUMN_KEY.FILE_NAME]);
      if (index > -1) setImageIndex(index);
    }
  }, [imageItems, record]);

  const _isDir = useMemo(() => {
    const isDirValue = record[PRIVATE_COLUMN_KEY.IS_DIR];
    if (typeof isDirValue === 'string') return isDirValue.toUpperCase() === 'TRUE';
    return isDirValue;
  }, [record]);

  const fileName = useMemo(() => {
    return record[column.key];
  }, [column, record]);

  const fileType = useMemo(() => {
    if (_isDir) return 'folder';
    if (!fileName) return '';
    const index = fileName.lastIndexOf('.');
    if (index === -1) return '';
    const suffix = fileName.slice(index).toLowerCase();
    if (suffix.indexOf(' ') > -1) return '';
    if (Utils.imageCheck(fileName)) return 'image';
    if (Utils.isMarkdownFile(fileName)) return 'markdown';
    if (Utils.isSdocFile(fileName)) return 'sdoc';
    return '';
  }, [_isDir, fileName]);

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

  if (fileType === 'image') {
    return (
      <ModalPortal>
        <ImageDialog
          imageItems={imageItems}
          imageIndex={imageIndex}
          closeImagePopup={onCommitCancel}
          moveToPrevImage={moveToPrevImage}
          moveToNextImage={moveToNextImage}
          onRotateImage={rotateImage}
        />
      </ModalPortal>
    );
  }

  return null;
};

FileNameEditor.propTypes = {
  column: PropTypes.object,
  record: PropTypes.object,
  onCommitCancel: PropTypes.func,
};

export default FileNameEditor;
