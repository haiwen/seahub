import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../../../components/context-menu';
import { Dirent } from '../../../../models';
import { useFileOperations } from '../../../../hooks/file-operations';
import { buildGalleryMenuOptions } from '../../../utils/menu-builder';
import { useMetadataStatus } from '../../../../hooks/metadata-status';
import { useMetadataView } from '../../../hooks/metadata-view';
import TextTranslation from '../../../../utils/text-translation';
import { getRowsByIds } from '../../../../components/sf-table/utils/table';
import { openInNewTab, openParentFolder } from '../../../utils/file';
import { EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY } from '../../../constants';
import { getColumnByKey } from '../../../utils/column';

const GalleryContextMenu = ({
  metadata,
  selectedImages,
  isSomeone,
  onDelete,
  onDuplicate,
  onRemoveImage,
  onAddImage,
  onSetPeoplePhoto
}) => {
  const { handleDownload: handleDownloadAPI, handleCopy: handleCopyAPI } = useFileOperations();
  const { enableFaceRecognition, enableTags } = useMetadataStatus();
  const {
    repoID,
    updateRecordDetails,
    updateFaceRecognition,
    updateRecordDescription,
    onOCR,
    generateFileTags
  } = useMetadataView();

  const readOnly = useMemo(() => !window.sfMetadataContext.canModify(), []);

  const faceRecognitionPermission = useMemo(() => {
    return {
      canAddPhotoToPeople: window.sfMetadataContext.canAddPhotoToPeople(),
      canRemovePhotoFromPeople: window.sfMetadataContext.canRemovePhotoFromPeople(),
      canSetPeoplePhoto: window.sfMetadataContext.canSetPeoplePhoto(),
    };
  }, []);

  const records = useMemo(() => {
    const ids = selectedImages.map(image => image.id);
    return getRowsByIds(metadata, ids);
  }, [metadata, selectedImages]);

  const options = useMemo(() => {
    const selectedRecordIds = selectedImages.map(image => image.id);
    const records = getRowsByIds(metadata, selectedRecordIds);
    const metadataStatus = {
      enableFaceRecognition,
      enableGenerateDescription: getColumnByKey(metadata.columns, PRIVATE_COLUMN_KEY.FILE_DESCRIPTION) !== null,
      enableTags
    };
    return buildGalleryMenuOptions(
      records,
      readOnly,
      metadataStatus,
      isSomeone,
      faceRecognitionPermission
    );
  }, [selectedImages, metadata, enableFaceRecognition, enableTags, readOnly, isSomeone, faceRecognitionPermission]);

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

  const handleOptionClick = useCallback((option, event) => {
    switch (option.key) {
      case TextTranslation.OPEN_FILE_IN_NEW_TAB.key:
        openInNewTab(repoID, records[0]);
        break;
      case TextTranslation.OPEN_PARENT_FOLDER.key:
        openParentFolder(records[0]);
        break;
      case TextTranslation.MOVE.key:
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_MOVE_DIALOG, records);
        break;
      case TextTranslation.DOWNLOAD.key:
        handleDownload();
        break;
      case TextTranslation.DELETE.key:
        onDelete(selectedImages);
        break;
      case TextTranslation.COPY.key:
        handleCopy();
        break;
      case TextTranslation.REMOVE_FROM_GROUP.key:
        onRemoveImage(selectedImages);
        break;
      case TextTranslation.ADD_TO_GROUPS.key:
        onAddImage();
        break;
      case TextTranslation.SET_AS_COVER.key:
        onSetPeoplePhoto(selectedImages[0]);
        break;
      case TextTranslation.DETECT_FACES.key:
        if (records.length > 0 && updateFaceRecognition) {
          updateFaceRecognition(records);
        }
        break;
      case TextTranslation.EXTRACT_FILE_DETAIL.key:
      case TextTranslation.EXTRACT_FILE_DETAILS.key:
        if (records.length > 0 && updateRecordDetails) {
          updateRecordDetails(records);
        }
        break;
      case TextTranslation.GENERATE_DESCRIPTION.key:
        if (records.length === 1 && updateRecordDescription) {
          updateRecordDescription(records[0]);
        }
        break;
      case TextTranslation.GENERATE_TAGS.key:
        if (records.length === 1 && generateFileTags) {
          generateFileTags(records[0]);
        }
        break;
      case TextTranslation.EXTRACT_TEXT.key:
        if (records.length === 1 && onOCR) {
          onOCR(records[0], '.metadata-gallery-image-item-selected');
        }
        break;
      default:
        break;
    }
  }, [repoID, records, handleDownload, onDelete, selectedImages, handleCopy, onRemoveImage, onAddImage, onSetPeoplePhoto, updateFaceRecognition, updateRecordDetails, updateRecordDescription, generateFileTags, onOCR]);

  return (
    <ContextMenu
      options={options}
      allowedTriggerElements={['.metadata-gallery-image-item', '.metadata-gallery-grid-image']}
      onOptionClick={handleOptionClick}
    />
  );
};

GalleryContextMenu.propTypes = {
  metadata: PropTypes.object.isRequired,
  selectedImages: PropTypes.array,
  isSomeone: PropTypes.bool,
  onDelete: PropTypes.func,
  onDuplicate: PropTypes.func,
  onRemoveImage: PropTypes.func,
  onAddImage: PropTypes.func,
  onSetPeoplePhoto: PropTypes.func,
};

export default GalleryContextMenu;
