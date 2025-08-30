import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../../../components/context-menu';
import { gettext } from '../../../../utils/constants';
import { Dirent } from '../../../../models';
import { useFileOperations } from '../../../../hooks/file-operations';
import { GALLERY_OPERATION_KEYS } from '../../../constants';

const GalleryContextMenu = ({ selectedImages, onDelete, onDuplicate, onRemoveImage, onAddImage, onSetPeoplePhoto }) => {
  const { handleDownload: handleDownloadAPI, handleCopy: handleCopyAPI } = useFileOperations();

  const checkCanDeleteRow = window.sfMetadataContext.checkCanDeleteRow();
  const canDuplicateRow = window.sfMetadataContext.canDuplicateRow();
  const canRemovePhotoFromPeople = window.sfMetadataContext.canRemovePhotoFromPeople();
  const canAddPhotoToPeople = window.sfMetadataContext.canAddPhotoToPeople();
  const canSetPeoplePhoto = window.sfMetadataContext.canSetPeoplePhoto();

  const options = useMemo(() => {
    let validOptions = [{ value: GALLERY_OPERATION_KEYS.DOWNLOAD, label: gettext('Download') }];
    if (onDelete && checkCanDeleteRow) {
      validOptions.push({
        value: GALLERY_OPERATION_KEYS.DELETE,
        label: gettext('Delete')
      });
    }
    if (onDuplicate && canDuplicateRow && selectedImages.length === 1) {
      validOptions.push({
        value: GALLERY_OPERATION_KEYS.COPY,
        label: gettext('Copy')
      });
    }
    if (onRemoveImage && canRemovePhotoFromPeople) {
      validOptions.push({
        value: GALLERY_OPERATION_KEYS.REMOVE_PHOTO_FROM_CURRENT_SET,
        label: gettext('Remove from this group')
      });
    }
    if (onAddImage && canAddPhotoToPeople) {
      validOptions.push({
        value: GALLERY_OPERATION_KEYS.ADD_PHOTO_TO_GROUPS,
        label: gettext('Add to groups')
      });
    }
    if (onSetPeoplePhoto && canSetPeoplePhoto && selectedImages.length === 1) {
      validOptions.push({
        value: GALLERY_OPERATION_KEYS.SET_PHOTO_AS_COVER,
        label: gettext('Set as cover photo')
      });
    }
    return validOptions;
  }, [checkCanDeleteRow, canDuplicateRow, canRemovePhotoFromPeople,
    canAddPhotoToPeople, selectedImages, onDuplicate, onDelete,
    onRemoveImage, onAddImage, canSetPeoplePhoto, onSetPeoplePhoto]);

  const handleDuplicate = useCallback((destRepo, dirent, destPath, nodeParentPath, isByDialog) => {
    const selectedImage = selectedImages[0];
    onDuplicate(selectedImage.id, destRepo, dirent, destPath, nodeParentPath, isByDialog);
  }, [selectedImages, onDuplicate]);

  const handleCopy = useCallback(() => {
    if (!selectedImages.length) return;
    const dirent = new Dirent({ name: selectedImages[0]?.name });
    const path = selectedImages[0]?.parentDir;
    handleCopyAPI(path, dirent, false, handleDuplicate);
  }, [selectedImages, handleCopyAPI, handleDuplicate]);

  const handleDownload = useCallback(() => {
    if (!selectedImages.length) return;
    const direntList = selectedImages.map(image => {
      const name = image.parentDir === '/' ? image.name : `${image.parentDir}/${image.name}`;
      return { name };
    });
    handleDownloadAPI('/', direntList);
  }, [handleDownloadAPI, selectedImages]);

  const handleOptionClick = useCallback(option => {
    switch (option.value) {
      case GALLERY_OPERATION_KEYS.DOWNLOAD:
        handleDownload();
        break;
      case GALLERY_OPERATION_KEYS.DELETE:
        onDelete(selectedImages);
        break;
      case GALLERY_OPERATION_KEYS.COPY:
        handleCopy();
        break;
      case GALLERY_OPERATION_KEYS.REMOVE_PHOTO_FROM_CURRENT_SET:
        onRemoveImage(selectedImages);
        break;
      case GALLERY_OPERATION_KEYS.ADD_PHOTO_TO_GROUPS:
        onAddImage();
        break;
      case GALLERY_OPERATION_KEYS.SET_PHOTO_AS_COVER:
        onSetPeoplePhoto(selectedImages[0]);
        break;
      default:
        break;
    }
  }, [handleDownload, onDelete, selectedImages, handleCopy, onRemoveImage, onAddImage, onSetPeoplePhoto]);

  return (
    <ContextMenu
      options={options}
      ignoredTriggerElements={['.metadata-gallery-image-item', '.metadata-gallery-grid-image']}
      onOptionClick={handleOptionClick}
    />
  );
};

GalleryContextMenu.propTypes = {
  metadata: PropTypes.object,
  selectedImages: PropTypes.array,
  onDelete: PropTypes.func,
  onDuplicate: PropTypes.func,
};

export default GalleryContextMenu;
