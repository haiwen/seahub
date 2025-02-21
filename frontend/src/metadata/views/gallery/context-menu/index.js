import React, { useMemo, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../../../components/context-menu';
import { gettext, useGoFileserver, fileServerRoot } from '../../../../utils/constants';
import { getRowById } from '../../../utils/table';
import { downloadFile } from '../../../utils/file';
import ZipDownloadDialog from '../../../../components/dialog/zip-download-dialog';
import metadataAPI from '../../../api';
import toaster from '../../../../components/toast';
import { Utils } from '../../../../utils/utils';
import ModalPortal from '../../../../components/modal-portal';
import CopyDirent from '../../../../components/dialog/copy-dirent-dialog';
import { Dirent } from '../../../../models';
import PeoplesDialog from '../../../components/dialog/peoples-dialog';

const CONTEXT_MENU_KEY = {
  DOWNLOAD: 'download',
  DELETE: 'delete',
  DUPLICATE: 'duplicate',
  REMOVE: 'remove',
  SET_PEOPLE_PHOTO: 'set_people_photo',
  ADD_PHOTO_TO_GROUPS: 'add_photo_to_groups',
};

const GalleryContextMenu = ({ metadata, selectedImages, onDelete, onDuplicate, addFolder, onRemoveImage, onAddImage, onSetPeoplePhoto }) => {
  const [isZipDialogOpen, setIsZipDialogOpen] = useState(false);
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [isPeoplesDialogShow, setPeoplesDialogShow] = useState(false);

  const repoID = window.sfMetadataContext.getSetting('repoID');
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

  const closeZipDialog = () => {
    setIsZipDialogOpen(false);
  };

  const toggleCopyDialog = useCallback(() => {
    setIsCopyDialogOpen(!isCopyDialogOpen);
  }, [isCopyDialogOpen]);

  const handleDuplicate = useCallback((destRepo, dirent, destPath, nodeParentPath, isByDialog) => {
    const selectedImage = selectedImages[0];
    onDuplicate(selectedImage.id, destRepo, dirent, destPath, nodeParentPath, isByDialog);
  }, [selectedImages, onDuplicate]);

  const handleDownload = useCallback(() => {
    if (!selectedImages.length) return;
    if (selectedImages.length === 1) {
      const image = selectedImages[0];
      const record = getRowById(metadata, image.id);
      downloadFile(repoID, record);
      return;
    }
    if (!useGoFileserver) {
      setIsZipDialogOpen(true);
      return;
    }
    const dirents = selectedImages.map(image => {
      const value = image.parentDir === '/' ? image.name : `${image.parentDir}/${image.name}`;
      return value;
    });
    metadataAPI.zipDownload(repoID, '/', dirents).then((res) => {
      const zipToken = res.data['zip_token'];
      location.href = `${fileServerRoot}zip/${zipToken}`;
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID, metadata, selectedImages]);

  const handleOptionClick = useCallback(option => {
    switch (option.value) {
      case CONTEXT_MENU_KEY.DOWNLOAD:
        handleDownload();
        break;
      case CONTEXT_MENU_KEY.DELETE:
        onDelete(selectedImages);
        break;
      case CONTEXT_MENU_KEY.DUPLICATE:
        toggleCopyDialog();
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
  }, [handleDownload, onDelete, selectedImages, toggleCopyDialog, onRemoveImage, onSetPeoplePhoto]);

  const closePeoplesDialog = useCallback(() => {
    setPeoplesDialogShow(false);
  }, []);

  const addPeople = useCallback((peopleIds, addedImages, callback) => {
    onAddImage(peopleIds, addedImages, callback);
  }, [onAddImage]);

  const dirent = new Dirent({ name: selectedImages[0]?.name });
  const parentDir = selectedImages[0]?.parentDir;

  return (
    <>
      <ContextMenu
        options={options}
        ignoredTriggerElements={['.metadata-gallery-image-item', '.metadata-gallery-grid-image']}
        onOptionClick={handleOptionClick}
      />
      {isZipDialogOpen && (
        <ModalPortal>
          <ZipDownloadDialog
            repoID={repoID}
            path="/"
            target={selectedImages.map(image => image.parentDir === '/' ? image.name : `${image.parentDir}/${image.name}`)}
            toggleDialog={closeZipDialog}
          />
        </ModalPortal>
      )}
      {isCopyDialogOpen && (
        <ModalPortal>
          <CopyDirent
            path={parentDir}
            repoID={repoID}
            dirent={dirent}
            isMultipleOperation={false}
            repoEncrypted={false}
            onItemCopy={handleDuplicate}
            onCancelCopy={toggleCopyDialog}
            onAddFolder={addFolder}
          />
        </ModalPortal>
      )}
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
  addFolder: PropTypes.func,
};

export default GalleryContextMenu;
