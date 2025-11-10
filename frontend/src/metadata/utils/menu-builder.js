import { enableSeafileAI, gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { checkIsDir } from './row';
import { getFileNameFromRecord } from './cell';
import TextTranslation from '../../utils/text-translation';

export const shouldEnableOption = (records, optionKey, readOnly, metadataStatus, isMultiple, areRecordsInSameFolder, isNameCol, isSelectedRange) => {
  if (!records || records.length === 0) return false;

  switch (optionKey) {
    case TextTranslation.OPEN_FILE_IN_NEW_TAB.key:
    case TextTranslation.OPEN_FOLDER_IN_NEW_TAB.key:
    case TextTranslation.OPEN_PARENT_FOLDER.key:
      return !isMultiple && !isSelectedRange;

    case TextTranslation.CLEAR_SELECTED.key:
      return isSelectedRange && !readOnly;

    case TextTranslation.COPY_SELECTED.key:
      return isSelectedRange;

    case TextTranslation.RENAME.key:{
      if (isMultiple || isSelectedRange || readOnly) return false;
      return isNameCol;
    }

    case TextTranslation.MOVE.key:
    case TextTranslation.MOVE_FILE.key:
    case TextTranslation.MOVE_FOLDER.key: {
      if (isSelectedRange || readOnly) return false;
      if (isMultiple) return areRecordsInSameFolder;
      return true;
    }

    case TextTranslation.COPY.key: {
      if (isSelectedRange || readOnly) return false;
      if (isMultiple) return areRecordsInSameFolder;
      return true;
    }

    case TextTranslation.DOWNLOAD.key: {
      if (isSelectedRange) return false;
      if (isMultiple) return areRecordsInSameFolder;
      return true;
    }

    case TextTranslation.DELETE.key:
    case TextTranslation.DELETE_FILE.key:
    case TextTranslation.DELETE_FOLDER.key:
    case TextTranslation.DELETE_SELECTED.key: {
      if (readOnly) return false;
      return true;
    }

    case TextTranslation.EXTRACT_FILE_DETAILS.key: {
      if (!enableSeafileAI || !isMultiple || readOnly) return false;
      const hasNonDirectories = records.some(record => !checkIsDir(record));
      if (!hasNonDirectories) return false;
      const hasImageOrVideo = records.some(record => {
        if (checkIsDir(record) || readOnly) return false;
        const fileName = getFileNameFromRecord(record);
        return Utils.imageCheck(fileName) || Utils.videoCheck(fileName);
      });
      return hasImageOrVideo;
    }

    case TextTranslation.EXTRACT_FILE_DETAIL.key: {
      if (!enableSeafileAI) return false;
      if (isMultiple) return false;
      const record = records[0];
      if (!record || checkIsDir(record) || readOnly) return false;
      const fileName = getFileNameFromRecord(record);
      return Utils.imageCheck(fileName) || Utils.videoCheck(fileName);
    }

    case TextTranslation.DETECT_FACES.key: {
      const { enableFaceRecognition } = metadataStatus;
      if (!enableSeafileAI || !enableFaceRecognition || readOnly) return false;
      const hasNonDirectories = records.some(record => !checkIsDir(record));
      if (!hasNonDirectories) return false;
      const hasImages = records.some(record => {
        if (checkIsDir(record) || readOnly) return false;
        const fileName = getFileNameFromRecord(record);
        return Utils.imageCheck(fileName);
      });
      return hasImages;
    }

    case TextTranslation.GENERATE_DESCRIPTION.key: {
      if (!enableSeafileAI) return false;
      if (isMultiple) return false;
      const record = records[0];
      if (!record || checkIsDir(record) || readOnly) return false;
      const enableGenerateDescription = metadataStatus;
      if (!enableGenerateDescription) return false;
      const fileName = getFileNameFromRecord(record);
      return Utils.isDescriptionSupportedFile(fileName);
    }

    case TextTranslation.GENERATE_TAGS.key: {
      if (!enableSeafileAI) return false;
      if (isMultiple) return false;
      const record = records[0];
      if (!record || checkIsDir(record) || readOnly) return false;
      const enableTags = metadataStatus;
      if (!enableTags) return false;
      const fileName = getFileNameFromRecord(record);
      const isVideo = Utils.videoCheck(fileName);
      return Utils.isDescriptionSupportedFile(fileName) && !isVideo;
    }

    case TextTranslation.EXTRACT_TEXT.key: {
      if (!enableSeafileAI) return false;
      if (isMultiple) return false;
      const record = records[0];
      if (!record || checkIsDir(record) || readOnly) return false;
      const fileName = getFileNameFromRecord(record);
      return Utils.imageCheck(fileName) || Utils.pdfCheck(fileName);
    }

    default:
      return false;
  }
};

export const buildAISubmenuOptions = (records, readOnly, metadataStatus, isMultiple = false) => {
  if (!enableSeafileAI || !records || records.length === 0) {
    return [];
  }

  const aiOptions = [];

  const addAIOptionIfEnabled = (optionKey, textTranslation) => {
    const isEnabled = shouldEnableOption(records, optionKey, readOnly, metadataStatus, isMultiple, false, false, false);
    if (isEnabled) {
      aiOptions.push({
        key: textTranslation.key,
        value: textTranslation.value
      });
    }
  };

  if (isMultiple) {
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

export const buildTableMenuOptions = (records, readOnly, metadataStatus, isMultiple = false, areRecordsInSameFolder = false, isNameCol = false, isSelectedRange = false) => {
  if (!records || records.length === 0) {
    return [];
  }

  const menuOptions = [];
  const firstRecord = records[0];
  const isFolder = firstRecord ? checkIsDir(firstRecord) : false;

  const addOptionIfEnabled = (optionKey, option) => {
    const isEnabled = shouldEnableOption(records, optionKey, readOnly, metadataStatus, isMultiple, areRecordsInSameFolder, isNameCol, isSelectedRange);
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

    const aiOptions = buildAISubmenuOptions(records, readOnly, metadataStatus, isMultiple);
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

  const hasBasicOptions = menuOptions.length > 0;
  const beforeEditOptionsLength = menuOptions.length;

  addOptionIfEnabled(TextTranslation.RENAME.key, {
    key: TextTranslation.RENAME.key,
    value: isFolder ? TextTranslation.RENAME_FOLDER.value : TextTranslation.RENAME_FILE.value
  });

  addOptionIfEnabled(TextTranslation.MOVE.key, {
    key: TextTranslation.MOVE.key,
    value: isMultiple ? TextTranslation.MOVE.value : (isFolder ? TextTranslation.MOVE_FOLDER.value : TextTranslation.MOVE_FILE.value)
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
    value: isMultiple ? TextTranslation.DELETE.value : (isFolder ? TextTranslation.DELETE_FOLDER.value : TextTranslation.DELETE_FILE.value)
  });

  const hasEditOptions = menuOptions.length > beforeEditOptionsLength;
  if (hasBasicOptions && hasEditOptions) {
    menuOptions.splice(beforeEditOptionsLength, 0, 'Divider');
  }

  const aiOptions = buildAISubmenuOptions(records, readOnly, metadataStatus, isMultiple);
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

export const buildTableToolbarMenuOptions = (records, readOnly, metadataStatus, isMultiple = false, areRecordsInSameFolder = false, isNameCol = false) => {
  if (!records || records.length === 0) {
    return [];
  }

  const menuOptions = [];
  const firstRecord = records[0];
  const isFolder = firstRecord ? checkIsDir(firstRecord) : false;

  const addOptionIfEnabled = (optionKey, option) => {
    const isEnabled = shouldEnableOption(records, optionKey, readOnly, metadataStatus, isMultiple, areRecordsInSameFolder, isNameCol, false);
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

  const aiOptions = buildAISubmenuOptions(records, readOnly, metadataStatus, isMultiple);
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

export const buildGalleryMenuOptions = (selectedImages, readOnly, metadataStatus, isSomeone, faceRecognitionPermission) => {
  if (!selectedImages || selectedImages.length === 0) {
    return [];
  }

  const menuOptions = [];
  const isMultipleImages = selectedImages.length > 1;

  if (isMultipleImages) {
    menuOptions.push({
      key: TextTranslation.DOWNLOAD.key,
      value: TextTranslation.DOWNLOAD.value
    });

    if (!readOnly) {
      menuOptions.push({
        key: TextTranslation.DELETE.key,
        value: TextTranslation.DELETE.value
      });
    }

    const aiOptions = buildAISubmenuOptions(selectedImages, readOnly, metadataStatus, isMultipleImages);

    if (aiOptions.length > 0) {
      menuOptions.push('Divider');
      menuOptions.push({
        key: 'AI',
        value: gettext('AI'),
        subOpList: aiOptions
      });
    }

    if (isSomeone !== null && !readOnly) {
      const { canRemovePhotoFromPeople, canAddPhotoToPeople } = faceRecognitionPermission;
      if (menuOptions.length > 0) {
        menuOptions.push('Divider');
      }
      if (isSomeone && canRemovePhotoFromPeople) {
        menuOptions.push({
          key: TextTranslation.REMOVE_FROM_GROUP.key,
          value: TextTranslation.REMOVE_FROM_GROUP.value
        });
      }
      if (!isSomeone && canAddPhotoToPeople) {
        menuOptions.push({
          key: TextTranslation.ADD_TO_GROUPS.key,
          value: TextTranslation.ADD_TO_GROUPS.value
        });
      }
    }

    return menuOptions;
  }

  menuOptions.push({
    key: TextTranslation.OPEN_FILE_IN_NEW_TAB.key,
    value: TextTranslation.OPEN_FILE_IN_NEW_TAB.value
  });

  menuOptions.push({
    key: TextTranslation.OPEN_PARENT_FOLDER.key,
    value: TextTranslation.OPEN_PARENT_FOLDER.value
  });

  menuOptions.push('Divider');

  if (!readOnly) {
    menuOptions.push({
      key: TextTranslation.MOVE.key,
      value: TextTranslation.MOVE.value
    });

    menuOptions.push({
      key: TextTranslation.COPY.key,
      value: TextTranslation.COPY.value
    });
  }

  menuOptions.push({
    key: TextTranslation.DOWNLOAD.key,
    value: TextTranslation.DOWNLOAD.value
  });

  if (!readOnly) {
    menuOptions.push({
      key: TextTranslation.DELETE.key,
      value: TextTranslation.DELETE.value
    });
  }

  const aiOptions = buildAISubmenuOptions(selectedImages, readOnly, metadataStatus, isMultipleImages);
  if (aiOptions.length > 0) {
    menuOptions.push('Divider');
    menuOptions.push({
      key: 'AI',
      value: gettext('AI'),
      subOpList: aiOptions
    });
  }

  if (isSomeone !== undefined && !readOnly) {
    menuOptions.push('Divider');

    const { canRemovePhotoFromPeople, canAddPhotoToPeople, canSetPeoplePhoto } = faceRecognitionPermission;
    if (isSomeone && canRemovePhotoFromPeople) {
      menuOptions.push({
        key: TextTranslation.REMOVE_FROM_GROUP.key,
        value: TextTranslation.REMOVE_FROM_GROUP.value
      });
    }

    if (!isSomeone && canAddPhotoToPeople) {
      menuOptions.push({
        key: TextTranslation.ADD_TO_GROUPS.key,
        value: TextTranslation.ADD_TO_GROUPS.value
      });
    }

    if (canSetPeoplePhoto) {
      menuOptions.push({
        key: TextTranslation.SET_AS_COVER.key,
        value: TextTranslation.SET_AS_COVER.value
      });
    }
  }
  return menuOptions;
};

export const buildGalleryToolbarMenuOptions = (selectedImages, readOnly, metadataStatus, isSomeone, faceRecognitionPermission = {}) => {
  if (!selectedImages || selectedImages.length === 0) {
    return [];
  }

  const menuOptions = [];
  const isMultipleImages = selectedImages.length > 1;

  if (isMultipleImages) {
    const aiOptions = buildAISubmenuOptions(selectedImages, readOnly, metadataStatus, isMultipleImages);
    if (aiOptions.length > 0) {
      menuOptions.push({
        key: 'AI',
        value: gettext('AI'),
        subOpList: aiOptions
      });
    }

    if (isSomeone !== null && !readOnly) {
      const { canRemovePhotoFromPeople, canAddPhotoToPeople } = faceRecognitionPermission;
      if (menuOptions.length > 0) {
        menuOptions.push('Divider');
      }
      if (isSomeone && canRemovePhotoFromPeople) {
        menuOptions.push({
          key: TextTranslation.REMOVE_FROM_GROUP.key,
          value: TextTranslation.REMOVE_FROM_GROUP.value
        });
      }
      if (!isSomeone && canAddPhotoToPeople) {
        menuOptions.push({
          key: TextTranslation.ADD_TO_GROUPS.key,
          value: TextTranslation.ADD_TO_GROUPS.value
        });
      }
    }
    return menuOptions;
  }

  menuOptions.push({
    key: TextTranslation.OPEN_FILE_IN_NEW_TAB.key,
    value: TextTranslation.OPEN_FILE_IN_NEW_TAB.value
  });

  menuOptions.push({
    key: TextTranslation.OPEN_PARENT_FOLDER.key,
    value: TextTranslation.OPEN_PARENT_FOLDER.value
  });

  const aiOptions = buildAISubmenuOptions(selectedImages, readOnly, metadataStatus, isMultipleImages);
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

  if (isSomeone !== null && !readOnly) {
    menuOptions.push('Divider');
    const { canRemovePhotoFromPeople, canAddPhotoToPeople, canSetPeoplePhoto } = faceRecognitionPermission;
    if (isSomeone && canRemovePhotoFromPeople) {
      menuOptions.push({
        key: TextTranslation.REMOVE_FROM_GROUP.key,
        value: TextTranslation.REMOVE_FROM_GROUP.value
      });
    }

    if (!isSomeone && canAddPhotoToPeople) {
      menuOptions.push({
        key: TextTranslation.ADD_TO_GROUPS.key,
        value: TextTranslation.ADD_TO_GROUPS.value
      });
    }

    if (canSetPeoplePhoto) {
      menuOptions.push({
        key: TextTranslation.SET_AS_COVER.key,
        value: TextTranslation.SET_AS_COVER.value
      });
    }
  }

  return menuOptions;
};

export const buildKanbanMenuOptions = (records, readOnly, metadataStatus) => {
  if (!records || records.length === 0) {
    return [];
  }

  const menuOptions = [];

  menuOptions.push({
    key: TextTranslation.OPEN_FILE_IN_NEW_TAB.key,
    value: TextTranslation.OPEN_FILE_IN_NEW_TAB.value
  });

  menuOptions.push({
    key: TextTranslation.OPEN_PARENT_FOLDER.key,
    value: TextTranslation.OPEN_PARENT_FOLDER.value
  });

  menuOptions.push('Divider');

  if (!readOnly) {
    menuOptions.push({
      key: TextTranslation.RENAME.key,
      value: TextTranslation.RENAME.value
    });

    menuOptions.push({
      key: TextTranslation.MOVE.key,
      value: TextTranslation.MOVE.value
    });

    menuOptions.push({
      key: TextTranslation.COPY.key,
      value: TextTranslation.COPY.value
    });
  }

  menuOptions.push({
    key: TextTranslation.DOWNLOAD.key,
    value: TextTranslation.DOWNLOAD.value
  });

  if (!readOnly) {
    menuOptions.push({
      key: TextTranslation.DELETE.key,
      value: TextTranslation.DELETE.value
    });
  }

  const aiOptions = buildAISubmenuOptions(records, readOnly, metadataStatus);
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

export const buildKanbanToolbarMenuOptions = (records, readOnly, metadataStatus) => {
  if (!records || records.length === 0) {
    return [];
  }

  const menuOptions = [];

  menuOptions.push({
    key: TextTranslation.OPEN_FILE_IN_NEW_TAB.key,
    value: TextTranslation.OPEN_FILE_IN_NEW_TAB.value
  });

  menuOptions.push({
    key: TextTranslation.OPEN_PARENT_FOLDER.key,
    value: TextTranslation.OPEN_PARENT_FOLDER.value
  });

  if (!readOnly) {
    menuOptions.push('Divider');
    menuOptions.push({
      key: TextTranslation.RENAME.key,
      value: TextTranslation.RENAME.value
    });
  }

  const aiOptions = buildAISubmenuOptions(records, readOnly, metadataStatus);
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
  return menuOptions;
};

export const buildCardToolbarMenuOptions = (records, readOnly, metadataStatus) => {
  if (!records || records.length === 0) {
    return [];
  }
  const menuOptions = [
    {
      key: TextTranslation.OPEN_FILE_IN_NEW_TAB.key,
      value: TextTranslation.OPEN_FILE_IN_NEW_TAB.value
    },
    {
      key: TextTranslation.OPEN_PARENT_FOLDER.key,
      value: TextTranslation.OPEN_PARENT_FOLDER.value
    }
  ];
  if (!readOnly) {
    menuOptions.push('Divider');
    menuOptions.push(
      {
        key: TextTranslation.RENAME.key,
        value: TextTranslation.RENAME.value
      }
    );
  }
  const aiOptions = buildAISubmenuOptions(records, readOnly, metadataStatus);
  if (aiOptions.length > 0) {
    if (menuOptions.length > 0) {
      menuOptions.push('Divider');
    }
    menuOptions.push(
      {
        key: 'AI',
        value: gettext('AI'),
        subOpList: aiOptions
      }
    );
  }
  return menuOptions;
};

export const buildCardMenuOptions = (records, readOnly, metadataStatus) => {
  if (!records || records.length === 0) {
    return [];
  }

  const menuOptions = [];

  menuOptions.push({
    key: TextTranslation.OPEN_FILE_IN_NEW_TAB.key,
    value: TextTranslation.OPEN_FILE_IN_NEW_TAB.value
  });

  menuOptions.push({
    key: TextTranslation.OPEN_PARENT_FOLDER.key,
    value: TextTranslation.OPEN_PARENT_FOLDER.value
  });

  menuOptions.push('Divider');

  if (!readOnly) {
    menuOptions.push({
      key: TextTranslation.RENAME.key,
      value: TextTranslation.RENAME.value
    });

    menuOptions.push({
      key: TextTranslation.MOVE.key,
      value: TextTranslation.MOVE.value
    });

    menuOptions.push({
      key: TextTranslation.COPY.key,
      value: TextTranslation.COPY.value
    });
  }

  menuOptions.push({
    key: TextTranslation.DOWNLOAD.key,
    value: TextTranslation.DOWNLOAD.value
  });

  if (!readOnly) {
    menuOptions.push({
      key: TextTranslation.DELETE.key,
      value: TextTranslation.DELETE.value
    });
  }

  const aiOptions = buildAISubmenuOptions(records, readOnly, metadataStatus);
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
