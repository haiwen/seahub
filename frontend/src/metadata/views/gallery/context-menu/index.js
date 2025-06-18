import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../../../components/context-menu';
import ModalPortal from '../../../../components/modal-portal';
import PeoplesDialog from '../../../components/dialog/peoples-dialog';
import { gettext } from '../../../../utils/constants';
import { Dirent } from '../../../../models';
import { useFileOperations } from '../../../../hooks/file-operations';

const CONTEXT_MENU_KEY = {
  DOWNLOAD: 'download',
  DELETE: 'delete',
  DUPLICATE: 'duplicate',
  REMOVE: 'remove',
  SET_PEOPLE_PHOTO: 'set_people_photo',
  ADD_PHOTO_TO_GROUPS: 'add_photo_to_groups',
};

const GalleryContextMenu = ({ selectedImages, onDelete, onDuplicate, onRemoveImage, onAddImage, onSetPeoplePhoto }) => {
  const [isPeoplesDialogShow, setPeoplesDialogShow] = useState(false);

  const { handleDownload: handleDownloadAPI, handleCopy: handleCopyAPI } = useFileOperations();

  const checkCanDeleteRow = window.sfMetadataContext.checkCanDeleteRow();
  const canDuplicateRow = window.sfMetadataContext.canDuplicateRow();
  const canRemovePhotoFromPeople = window.sfMetadataContext.canRemovePhotoFromPeople();
  const canAddPhotoToPeople = window.sfMetadataContext.canAddPhotoToPeople();
  const canSetPeoplePhoto = window.sfMetadataContext.canSetPeoplePhoto();

  const options = useMemo(() => {
    let validOptions = [{ value: CONTEXT_MENU_KEY.DOWNLOAD, label: gettext('Download') }];
    if (onDelete && checkCanDeleteRow) {
      validOptions.push({ value: CONTEXT_MENU_KEY.DELETE, label: selectedImages.length > 1 ? gettext('Delete') : gettext('Delete file') });
    }
    if (onDuplicate && canDuplicateRow && selectedImages.length === 1) {
      validOptions.push({ value: CONTEXT_MENU_KEY.DUPLICATE, label: gettext('Duplicate') });
    }
    if (onRemoveImage && canRemovePhotoFromPeople) {
      validOptions.push({ value: CONTEXT_MENU_KEY.REMOVE, label: gettext('Remove from this group') });
    }
    if (onAddImage && canAddPhotoToPeople) {
      validOptions.push({ value: CONTEXT_MENU_KEY.ADD_PHOTO_TO_GROUPS, label: gettext('Add to groups') });
    }
    if (onSetPeoplePhoto && canSetPeoplePhoto) {
      validOptions.push({ value: CONTEXT_MENU_KEY.SET_PEOPLE_PHOTO, label: gettext('Set as cover photo') });
    }
    return validOptions;
  }, [checkCanDeleteRow, canDuplicateRow, canRemovePhotoFromPeople, canAddPhotoToPeople, selectedImages, onDuplicate, onDelete, onRemoveImage, onAddImage, canSetPeoplePhoto, onSetPeoplePhoto]);

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
      case CONTEXT_MENU_KEY.DOWNLOAD:
        handleDownload();
        break;
      case CONTEXT_MENU_KEY.DELETE:
        onDelete(selectedImages);
        break;
      case CONTEXT_MENU_KEY.DUPLICATE:
        handleCopy();
        break;
      case CONTEXT_MENU_KEY.REMOVE:
        onRemoveImage(selectedImages);
        break;
      case CONTEXT_MENU_KEY.ADD_PHOTO_TO_GROUPS:
        setPeoplesDialogShow(true);
        break;
      case CONTEXT_MENU_KEY.SET_PEOPLE_PHOTO:
        onSetPeoplePhoto(selectedImages[0]);
        break;
      default:
        break;
    }
  }, [handleDownload, onDelete, selectedImages, handleCopy, onRemoveImage, onSetPeoplePhoto]);

  const closePeoplesDialog = useCallback(() => {
    setPeoplesDialogShow(false);
  }, []);

  const addPeople = useCallback((peopleIds, addedImages, callback) => {
    onAddImage(peopleIds, addedImages, callback);
  }, [onAddImage]);

  return (
    <>
      <ContextMenu
        options={options}
        ignoredTriggerElements={['.metadata-gallery-image-item', '.metadata-gallery-grid-image']}
        onOptionClick={handleOptionClick}
      />
      {isPeoplesDialogShow && (
        <ModalPortal>
          <PeoplesDialog selectedImages={selectedImages} onToggle={closePeoplesDialog} onSubmit={addPeople} />
        </ModalPortal>
      )}
    </>
  );
};

GalleryContextMenu.propTypes = {
  metadata: PropTypes.object,
  selectedImages: PropTypes.array,
  onDelete: PropTypes.func,
  onDuplicate: PropTypes.func,
};

export default GalleryContextMenu;
