import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ModalPortal } from '@seafile/sf-metadata-ui-component';
import { PRIVATE_COLUMN_KEY } from '../../_basic';
import { Utils } from '../../../../utils/utils';
import ImageDialog from '../../../../components/dialog/image-dialog';
import { serviceURL, siteRoot, thumbnailSizeForOriginal } from '../../../../utils/constants';

const FileNameEditor = ({ column, record, onCommitCancel }) => {
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
    if (index === -1) return 'file';
    const suffix = fileName.slice(index).toLowerCase();
    if (Utils.imageCheck(fileName)) return 'image';
    if (suffix === '.sdoc') return 'sdoc';
    return 'file';
  }, [_isDir, fileName]);

  const parentDir = useMemo(() => {
    const value = record[PRIVATE_COLUMN_KEY.PARENT_DIR];
    if (value === '/') return '';
    return value;
  }, [record]);

  const repoID = useMemo(() => {
    return window.sfMetadataContext.getSetting('repoID');
  }, []);

  const path = useMemo(() => {
    return Utils.encodePath(Utils.joinPath(parentDir, fileName));
  }, [parentDir, fileName]);

  const url = useMemo(() => {
    return `${siteRoot}lib/${repoID}/file${path}`;
  }, [path, repoID]);

  useEffect(() => {
    if (fileType === 'image') return;
    onCommitCancel && onCommitCancel();
  }, [fileType, onCommitCancel]);

  if (!fileName) return null;

  if (fileType === 'image') {
    const fileExt = fileName.substr(fileName.lastIndexOf('.') + 1).toLowerCase();
    const isGIF = fileExt === 'gif';
    const useThumbnail = window.sfMetadataContext.getSetting('currentRepoInfo')?.encrypted;
    let src = '';
    if (useThumbnail && !isGIF) {
      src = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}`;
    } else {
      src = `${siteRoot}repo/${repoID}/raw${path}`;
    }
    const images = [
      { 'name': fileName, 'url': url, 'src': src },
    ];
    return (
      <ModalPortal>
        <ImageDialog
          imageItems={images}
          imageIndex={0}
          closeImagePopup={onCommitCancel}
          moveToPrevImage={() => {}}
          moveToNextImage={() => {}}
        />
      </ModalPortal>
    );
  }

  if (fileType === 'sdoc') {
    window.open(serviceURL + url);
  } else {
    window.open(window.location.href + Utils.encodePath(Utils.joinPath(parentDir, fileName)));
  }
  return null;
};

FileNameEditor.propTypes = {
  column: PropTypes.object,
  record: PropTypes.object,
  onCommitCancel: PropTypes.func,
};

export default FileNameEditor;
