import { enableSeafileAI, gettext } from '../../utils/constants';
import { PRIVATE_COLUMN_KEY } from '../constants';
import { Utils } from '../../utils/utils';
import { getColumnByKey, isNameColumn } from './column';
import { checkIsDir } from './row';
import { getFileNameFromRecord } from './cell';
import TextTranslation from '../../utils/text-translation';

export const shouldEnableOption = (records, optionKey, columns, enableFaceRecognition, readOnly, checkCanDeleteRow, isMultipleRecords, areRecordsInSameFolder, column, isSelectedRange) => {
  if (!records || records.length === 0) return false;

  switch (optionKey) {
    case TextTranslation.OPEN_FILE_IN_NEW_TAB.key:
    case TextTranslation.OPEN_FOLDER_IN_NEW_TAB.key:
    case TextTranslation.OPEN_PARENT_FOLDER.key:
      return !isMultipleRecords && !isSelectedRange;

    case TextTranslation.CLEAR_SELECTED.key:
      return isSelectedRange && !readOnly;

    case TextTranslation.COPY_SELECTED.key:
      return isSelectedRange;

    case TextTranslation.RENAME.key:
    case TextTranslation.RENAME_FILE.key:
    case TextTranslation.RENAME_FOLDER.key: {
      if (isMultipleRecords || isSelectedRange || readOnly) return false;
      const isNameCol = column && isNameColumn(column);
      return !readOnly && isNameCol;
    }

    case TextTranslation.MOVE.key:
    case TextTranslation.MOVE_FILE.key:
    case TextTranslation.MOVE_FOLDER.key: {
      if (isSelectedRange || readOnly) return false;
      if (isMultipleRecords && !areRecordsInSameFolder) return false;
      return true;
    }

    case TextTranslation.COPY.key: {
      if (isSelectedRange || readOnly) return false;
      if (isMultipleRecords) return areRecordsInSameFolder;
      return true;
    }

    case TextTranslation.DOWNLOAD.key: {
      if (isSelectedRange) return false;
      if (isMultipleRecords) return areRecordsInSameFolder;
      return true;
    }

    case TextTranslation.DELETE.key:
    case TextTranslation.DELETE_FILE.key:
    case TextTranslation.DELETE_FOLDER.key:
    case TextTranslation.DELETE_SELECTED.key: {
      if (typeof checkCanDeleteRow === 'boolean') {
        return checkCanDeleteRow && records.length > 0;
      } else if (typeof checkCanDeleteRow === 'function') {
        const deletableRecords = records.filter(r => checkCanDeleteRow(r));
        return deletableRecords.length > 0;
      }
      return false;
    }

    case TextTranslation.EXTRACT_FILE_DETAILS.key: {
      if (!enableSeafileAI || !isMultipleRecords || !readOnly) return false;
      const hasNonDirectories = records.some(record => !checkIsDir(record));
      if (!hasNonDirectories) return false;
      const hasImageOrVideo = records.some(record => {
        if (checkIsDir(record) || !readOnly) return false;
        const fileName = getFileNameFromRecord(record);
        return Utils.imageCheck(fileName) || Utils.videoCheck(fileName);
      });
      return hasImageOrVideo;
    }

    case TextTranslation.EXTRACT_FILE_DETAIL.key: {
      if (!enableSeafileAI) return false;
      if (isMultipleRecords) return false;
      const record = records[0];
      if (!record || checkIsDir(record) || !readOnly) return false;
      const fileName = getFileNameFromRecord(record);
      return Utils.imageCheck(fileName) || Utils.videoCheck(fileName);
    }

    case TextTranslation.DETECT_FACES.key: {
      if (!enableSeafileAI || !enableFaceRecognition || !readOnly) return false;
      const hasNonDirectories = records.some(record => !checkIsDir(record));
      if (!hasNonDirectories) return false;
      const hasImages = records.some(record => {
        if (checkIsDir(record) || !readOnly) return false;
        const fileName = getFileNameFromRecord(record);
        return Utils.imageCheck(fileName);
      });
      return hasImages;
    }

    case TextTranslation.GENERATE_DESCRIPTION.key: {
      if (!enableSeafileAI) return false;
      if (isMultipleRecords) return false;
      const record = records[0];
      if (!record || checkIsDir(record) || !readOnly) return false;
      const descriptionColumn = getColumnByKey(columns, PRIVATE_COLUMN_KEY.FILE_DESCRIPTION);
      if (!descriptionColumn) return false;
      const fileName = getFileNameFromRecord(record);
      return Utils.isDescriptionSupportedFile(fileName);
    }

    case TextTranslation.GENERATE_TAGS.key: {
      if (!enableSeafileAI) return false;
      if (isMultipleRecords) return false;
      const record = records[0];
      if (!record || checkIsDir(record) || !readOnly) return false;
      const tagsColumn = getColumnByKey(columns, PRIVATE_COLUMN_KEY.TAGS);
      if (!tagsColumn) return false;
      const fileName = getFileNameFromRecord(record);
      const isVideo = Utils.videoCheck(fileName);
      return Utils.isDescriptionSupportedFile(fileName) && !isVideo;
    }

    case TextTranslation.EXTRACT_TEXT.key: {
      if (!enableSeafileAI) return false;
      if (isMultipleRecords) return false;
      const record = records[0];
      if (!record || checkIsDir(record) || !readOnly) return false;
      const fileName = getFileNameFromRecord(record);
      return Utils.imageCheck(fileName) || Utils.pdfCheck(fileName);
    }

    default:
      return false;
  }
};

export const buildUnifiedMenuOptions = (records, columns, enableFaceRecognition, checkCanModifyRow, checkCanDeleteRow, isMultipleRecords = false, isReadonly = false, areRecordsInSameFolder = true, column = null, isSelectedRange = false) => {
  if (!records || records.length === 0) {
    return [];
  }

  const menuOptions = [];
  const firstRecord = records[0];
  const isFolder = firstRecord ? checkIsDir(firstRecord) : false;

  // Add option only if it should be enabled
  const addOptionIfEnabled = (optionKey, option) => {
    const isEnabled = shouldEnableOption(records, optionKey, columns, enableFaceRecognition, checkCanModifyRow, checkCanDeleteRow, isMultipleRecords, isReadonly, areRecordsInSameFolder, column, isSelectedRange);
    if (isEnabled) {
      menuOptions.push(option);
    }
  };

  if (isSelectedRange) {
    addOptionIfEnabled(TextTranslation.CLEAR_SELECTED.key, {
      key: TextTranslation.CLEAR_SELECTED.key,
      value: TextTranslation.CLEAR_SELECTED.value
    });

    addOptionIfEnabled(TextTranslation.COPY_SELECTED.key, {
      key: TextTranslation.COPY_SELECTED.key,
      value: TextTranslation.COPY_SELECTED.value
    });

    addOptionIfEnabled(TextTranslation.DELETE_SELECTED.key, {
      key: TextTranslation.DELETE_SELECTED.key,
      value: TextTranslation.DELETE_SELECTED.value
    });

    const aiOptions = buildAISubmenuOptions(records, columns, enableFaceRecognition, checkCanModifyRow, isMultipleRecords);
    if (aiOptions.length > 0) {
      menuOptions.push('Divider');
      menuOptions.push({
        key: 'AI',
        value: gettext('AI'),
        subOpList: aiOptions
      });
    }

    return menuOptions;
  }

  addOptionIfEnabled(isFolder ? TextTranslation.OPEN_FOLDER_IN_NEW_TAB.key : TextTranslation.OPEN_FILE_IN_NEW_TAB.key, {
    key: isFolder ? TextTranslation.OPEN_FOLDER_IN_NEW_TAB.key : TextTranslation.OPEN_FILE_IN_NEW_TAB.key,
    value: isFolder ? TextTranslation.OPEN_FOLDER_IN_NEW_TAB.value : TextTranslation.OPEN_FILE_IN_NEW_TAB.value
  });

  addOptionIfEnabled(TextTranslation.OPEN_PARENT_FOLDER.key, {
    key: TextTranslation.OPEN_PARENT_FOLDER.key,
    value: TextTranslation.OPEN_PARENT_FOLDER.value
  });

  // Add divider if we have basic options before adding edit options
  const hasBasicOptions = menuOptions.length > 0;

  // Store current length to check if edit options are added
  const beforeEditOptionsLength = menuOptions.length;

  addOptionIfEnabled(TextTranslation.RENAME.key, {
    key: TextTranslation.RENAME.key,
    value: isFolder ? TextTranslation.RENAME_FOLDER.value : TextTranslation.RENAME_FILE.value
  });

  addOptionIfEnabled(TextTranslation.MOVE.key, {
    key: TextTranslation.MOVE.key,
    value: isMultipleRecords ? TextTranslation.MOVE.value : (isFolder ? TextTranslation.MOVE_FOLDER.value : TextTranslation.MOVE_FILE.value)
  });

  addOptionIfEnabled(TextTranslation.COPY.key, {
    key: TextTranslation.COPY.key,
    value: TextTranslation.COPY.value
  });

  addOptionIfEnabled(TextTranslation.DOWNLOAD.key, {
    key: TextTranslation.DOWNLOAD.key,
    value: TextTranslation.DOWNLOAD.value
  });

  addOptionIfEnabled(TextTranslation.DELETE.key, {
    key: TextTranslation.DELETE.key,
    value: isMultipleRecords ? TextTranslation.DELETE.value : (isFolder ? TextTranslation.DELETE_FOLDER.value : TextTranslation.DELETE_FILE.value)
  });

  // Add divider between basic options and edit options if both exist
  const hasEditOptions = menuOptions.length > beforeEditOptionsLength;
  if (hasBasicOptions && hasEditOptions) {
    // Insert divider after basic options but before edit options
    menuOptions.splice(beforeEditOptionsLength, 0, 'Divider');
  }

  const aiOptions = buildAISubmenuOptions(records, columns, enableFaceRecognition, checkCanModifyRow, isMultipleRecords);
  if (aiOptions.length > 0) {
    menuOptions.push('Divider');
    menuOptions.push({
      key: 'AI',
      value: gettext('AI'),
      subOpList: aiOptions
    });
  }

  return menuOptions;
};

export const buildToolbarMenuOptions = (records, columns, enableFaceRecognition, checkCanModifyRow, checkCanDeleteRow, isMultipleRecords = false, isReadonly = false, areRecordsInSameFolder = true) => {
  if (!records || records.length === 0) {
    return [];
  }

  const menuOptions = [];
  const firstRecord = records[0];
  const isFolder = firstRecord ? checkIsDir(firstRecord) : false;

  const nameColumn = columns.find(col => isNameColumn(col));

  const addOptionIfEnabled = (optionKey, option) => {
    const isEnabled = shouldEnableOption(records, optionKey, columns, enableFaceRecognition, checkCanModifyRow, checkCanDeleteRow, isMultipleRecords, isReadonly, areRecordsInSameFolder, nameColumn, false);
    if (isEnabled) {
      menuOptions.push(option);
    }
  };

  addOptionIfEnabled(isFolder ? TextTranslation.OPEN_FOLDER_IN_NEW_TAB.key : TextTranslation.OPEN_FILE_IN_NEW_TAB.key, {
    key: isFolder ? TextTranslation.OPEN_FOLDER_IN_NEW_TAB.key : TextTranslation.OPEN_FILE_IN_NEW_TAB.key,
    value: isFolder ? TextTranslation.OPEN_FOLDER_IN_NEW_TAB.value : TextTranslation.OPEN_FILE_IN_NEW_TAB.value
  });

  addOptionIfEnabled(TextTranslation.OPEN_PARENT_FOLDER.key, {
    key: TextTranslation.OPEN_PARENT_FOLDER.key,
    value: TextTranslation.OPEN_PARENT_FOLDER.value
  });

  if (!isMultipleRecords) {
    if (menuOptions.length > 0) {
      menuOptions.push('Divider');
    }

    addOptionIfEnabled(TextTranslation.RENAME.key, {
      key: TextTranslation.RENAME.key,
      value: isFolder ? TextTranslation.RENAME_FOLDER.value : TextTranslation.RENAME_FILE.value
    });
  }

  const aiOptions = buildAISubmenuOptions(records, columns, enableFaceRecognition, checkCanModifyRow, isMultipleRecords);
  if (aiOptions.length > 0) {
    menuOptions.push('Divider');
    menuOptions.push({
      key: 'AI',
      value: gettext('AI'),
      subOpList: aiOptions
    });
  }

  return menuOptions;
};

export const buildAISubmenuOptions = (records, columns, enableFaceRecognition, readOnly, isMultipleRecords = false) => {
  if (!enableSeafileAI || !records || records.length === 0) {
    return [];
  }

  const aiOptions = [];

  const addAIOptionIfEnabled = (optionKey, textTranslation) => {
    const isEnabled = shouldEnableOption(records, optionKey, columns, enableFaceRecognition, readOnly, () => true, isMultipleRecords, false, true, null, false);
    if (isEnabled) {
      aiOptions.push({
        key: textTranslation.key,
        value: textTranslation.value
      });
    }
  };

  if (isMultipleRecords) {
    addAIOptionIfEnabled(TextTranslation.EXTRACT_FILE_DETAILS.key, TextTranslation.EXTRACT_FILE_DETAILS);
  } else {
    addAIOptionIfEnabled(TextTranslation.EXTRACT_FILE_DETAIL.key, TextTranslation.EXTRACT_FILE_DETAIL);
  }

  addAIOptionIfEnabled(TextTranslation.DETECT_FACES.key, TextTranslation.DETECT_FACES);
  addAIOptionIfEnabled(TextTranslation.GENERATE_DESCRIPTION.key, TextTranslation.GENERATE_DESCRIPTION);
  addAIOptionIfEnabled(TextTranslation.GENERATE_TAGS.key, TextTranslation.GENERATE_TAGS);
  addAIOptionIfEnabled(TextTranslation.EXTRACT_TEXT.key, TextTranslation.EXTRACT_TEXT);

  return aiOptions;
};

/**
 * Build gallery context menu options with disabled states and tooltips
 * @param {Array} selectedImages - Array of selected image records
 * @param {Array} columns - Array of metadata columns
 * @param {boolean} enableFaceRecognition - Whether face recognition is enabled
 * @param {Function} checkCanModifyRow - Function to check if a row can be modified
 * @param {Function} checkCanDeleteRow - Function to check if a row can be deleted
 * @param {Function} canDuplicateRow - Function to check if a row can be duplicated
 * @param {Function} canRemovePhotoFromPeople - Function to check if photo can be removed from people
 * @param {Function} canAddPhotoToPeople - Function to check if photo can be added to people
 * @param {Function} canSetPeoplePhoto - Function to check if photo can be set as people photo
 * @param {boolean} isReadonly - Whether in readonly mode
 * @returns {Array} Array of gallery menu options with disabled state and tooltips
 */
export const buildGalleryMenuOptions = (selectedImages, columns, enableFaceRecognition, checkCanModifyRow, checkCanDeleteRow, canRemovePhotoFromPeople, canAddPhotoToPeople, canSetPeoplePhoto, isReadonly = false, isSomeone) => {
  if (!selectedImages || selectedImages.length === 0) {
    return [];
  }

  const menuOptions = [];
  const isMultipleImages = selectedImages.length > 1;

  // For multiple images, only show download and delete like in table view
  if (isMultipleImages) {
    // Download - always available for multiple selection
    menuOptions.push({
      key: TextTranslation.DOWNLOAD.key,
      value: TextTranslation.DOWNLOAD.value
    });

    // Delete - only if permission allows
    if (typeof checkCanDeleteRow === 'boolean' ? checkCanDeleteRow : true) {
      menuOptions.push({
        key: TextTranslation.DELETE.key,
        value: TextTranslation.DELETE.value
      });
    }

    // Add AI submenu if any AI operations are available for multiple selection
    const aiOptions = buildAISubmenuOptions(selectedImages, columns, enableFaceRecognition, checkCanModifyRow, isMultipleImages);
    if (aiOptions.length > 0) {
      menuOptions.push('Divider');
      menuOptions.push({
        key: 'AI',
        value: gettext('AI'),
        subOpList: aiOptions
      });
    }

    return menuOptions;
  }

  // Single image selection - show all available options
  // Open in new tab - only for single image
  if (!isReadonly) {
    menuOptions.push({
      key: TextTranslation.OPEN_FILE_IN_NEW_TAB.key,
      value: TextTranslation.OPEN_FILE_IN_NEW_TAB.value
    });

    // Open parent folder
    menuOptions.push({
      key: TextTranslation.OPEN_PARENT_FOLDER.key,
      value: TextTranslation.OPEN_PARENT_FOLDER.value
    });

    menuOptions.push('Divider');
  }

  // Move - only if can modify
  if (!isReadonly && selectedImages.some(record => checkCanModifyRow(record))) {
    menuOptions.push({
      key: TextTranslation.MOVE.key,
      value: TextTranslation.MOVE.value
    });
  }

  // Copy - always available for single image
  if (!isReadonly) {
    menuOptions.push({
      key: TextTranslation.COPY.key,
      value: TextTranslation.COPY.value
    });
  }

  // Download - always available
  menuOptions.push({
    key: TextTranslation.DOWNLOAD.key,
    value: TextTranslation.DOWNLOAD.value
  });

  // Delete - only if permission allows
  if (typeof checkCanDeleteRow === 'boolean' ? checkCanDeleteRow : true) {
    menuOptions.push({
      key: TextTranslation.DELETE.key,
      value: TextTranslation.DELETE.value
    });
  }

  // Add AI submenu if available
  const aiOptions = buildAISubmenuOptions(selectedImages, columns, enableFaceRecognition, checkCanModifyRow, isMultipleImages);
  if (aiOptions.length > 0) {
    menuOptions.push('Divider');
    menuOptions.push({
      key: 'AI',
      value: gettext('AI'),
      subOpList: aiOptions
    });
  }

  // Faces-specific operations
  if (isSomeone && !isReadonly) {
    menuOptions.push('Divider');

    // Remove from group - only if available
    if (canRemovePhotoFromPeople) {
      menuOptions.push({
        key: TextTranslation.REMOVE_FROM_GROUP.key,
        value: TextTranslation.REMOVE_FROM_GROUP.value
      });
    }

    // Add to groups - only if available
    if (canAddPhotoToPeople) {
      menuOptions.push({
        key: TextTranslation.ADD_TO_GROUPS.key,
        value: TextTranslation.ADD_TO_GROUPS.value
      });
    }

    // Set as cover - only if available
    if (canSetPeoplePhoto) {
      menuOptions.push({
        key: TextTranslation.SET_AS_COVER.key,
        value: TextTranslation.SET_AS_COVER.value
      });
    }
  }

  return menuOptions;
};

/**
 * Build gallery toolbar dropdown menu options (excluding standalone button operations)
 * @param {Array} selectedImages - Array of selected image records
 * @param {Array} columns - Array of metadata columns
 * @param {boolean} enableFaceRecognition - Whether face recognition is enabled
 * @param {Function} checkCanModifyRow - Function to check if a row can be modified
 * @param {boolean} isReadonly - Whether in readonly mode
 * @returns {Array} Array of gallery toolbar dropdown menu options (excluding move/copy/download/delete)
 */
export const buildGalleryToolbarMenuOptions = (selectedImages, columns, enableFaceRecognition, readOnly, isSomeone = false, faceRecognitionPermission = {}) => {
  if (!selectedImages || selectedImages.length === 0) {
    return [];
  }

  const menuOptions = [];
  const isMultipleImages = selectedImages.length > 1;

  if (isMultipleImages) {
    const aiOptions = buildAISubmenuOptions(selectedImages, columns, enableFaceRecognition, readOnly, isMultipleImages);
    if (aiOptions.length > 0) {
      menuOptions.push({
        key: 'AI',
        value: gettext('AI'),
        subOpList: aiOptions
      });
    }
    return menuOptions;
  }

  if (!readOnly) {
    menuOptions.push({
      key: TextTranslation.OPEN_FILE_IN_NEW_TAB.key,
      value: TextTranslation.OPEN_FILE_IN_NEW_TAB.value
    });

    menuOptions.push({
      key: TextTranslation.OPEN_PARENT_FOLDER.key,
      value: TextTranslation.OPEN_PARENT_FOLDER.value
    });
  }

  // Add AI submenu if available
  const aiOptions = buildAISubmenuOptions(selectedImages, columns, enableFaceRecognition, readOnly, isMultipleImages);
  if (aiOptions.length > 0) {
    if (menuOptions.length > 0) {
      menuOptions.push('Divider');
    }
    menuOptions.push({
      key: 'AI',
      value: gettext('AI'),
      subOpList: aiOptions
    });
  }

  if (isSomeone && !readOnly) {
    menuOptions.push('Divider');

    // Remove from group - only if available
    const { canRemovePhotoFromPeople, canAddPhotoToPeople, canSetPeoplePhoto } = faceRecognitionPermission;
    if (canRemovePhotoFromPeople) {
      menuOptions.push({
        key: TextTranslation.REMOVE_FROM_GROUP.key,
        value: TextTranslation.REMOVE_FROM_GROUP.value
      });
    }

    // Add to groups - only if available
    if (canAddPhotoToPeople) {
      menuOptions.push({
        key: TextTranslation.ADD_TO_GROUPS.key,
        value: TextTranslation.ADD_TO_GROUPS.value
      });
    }

    // Set as cover - only if available
    if (canSetPeoplePhoto) {
      menuOptions.push({
        key: TextTranslation.SET_AS_COVER.key,
        value: TextTranslation.SET_AS_COVER.value
      });
    }
  }

  return menuOptions;
};
