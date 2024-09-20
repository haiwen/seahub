import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { ModalPortal } from '@seafile/sf-metadata-ui-component';
import { Utils } from '../../../utils/utils';
import ImageDialog from '../../../components/dialog/image-dialog';
import { siteRoot, thumbnailSizeForOriginal, fileServerRoot } from '../../../utils/constants';
import { PRIVATE_COLUMN_KEY } from '../../constants';

const FileNameEditor = ({ column, record, table, onCommitCancel }) => {
  const [imageIndex, setImageIndex] = useState(0);

  const imageItems = useMemo(() => {
    const repoID = window.sfMetadataContext.getSetting('repoID');

    return table.rows
      .filter(row => Utils.imageCheck(row[PRIVATE_COLUMN_KEY.FILE_NAME]))
      .map(item => {
        const fileName = item[PRIVATE_COLUMN_KEY.FILE_NAME];
        const parentDir = item[PRIVATE_COLUMN_KEY.PARENT_DIR];
        const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
        const fileExt = fileName.substr(fileName.lastIndexOf('.') + 1).toLowerCase();
        const isGIF = fileExt === 'gif';
        const useThumbnail = window.sfMetadataContext.getSetting('repoInfo')?.encrypted;
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
    const { key } = column;
    return record[key];
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

  if (fileType === 'image') {
    return (
      <ModalPortal>
        <ImageDialog
          imageItems={imageItems}
          imageIndex={imageIndex}
          closeImagePopup={onCommitCancel}
          moveToPrevImage={moveToPrevImage}
          moveToNextImage={moveToNextImage}
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
