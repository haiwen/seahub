import React, { useContext, useCallback, useMemo } from 'react';
import metadataAPI from '../metadata/api';
import { Utils } from '../utils/utils';
import toaster from '../components/toast';
import { PRIVATE_COLUMN_KEY, EVENT_BUS_TYPE } from '../metadata/constants';
import { gettext, lang } from '../utils/constants';

// This hook provides content related to metadata ai operation
const MetadataAIOperationsContext = React.createContext(null);

export const MetadataAIOperationsProvider = ({
  repoID,
  enableMetadata = false,
  enableOCR = false,
  enableTags = false,
  tagsLang,
  repoInfo,
  children
}) => {
  const permission = useMemo(() => repoInfo.permission !== 'admin' && repoInfo.permission !== 'rw' ? 'r' : 'rw', [repoInfo]);
  const canModify = useMemo(() => permission === 'rw', [permission]);

  const OCRSuccessCallBack = useCallback(({ parentDir, fileName, ocrResult } = {}) => {
    toaster.success(gettext('Successfully OCR'));
    if (!ocrResult) return;
    const update = { [PRIVATE_COLUMN_KEY.OCR]: ocrResult };
    metadataAPI.modifyRecord(repoID, { parentDir, fileName }, update).then(res => {
      const eventBus = window?.sfMetadataContext?.eventBus;
      eventBus && eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, { parentDir, fileName }, update);
    });
  }, [repoID]);

  const onOCR = useCallback(({ parentDir, fileName }, { success_callback, fail_callback } = {}) => {
    const filePath = Utils.joinPath(parentDir, fileName);
    metadataAPI.ocr(repoID, filePath).then(res => {
      const ocrResult = res.data.ocr_result;
      const validResult = Array.isArray(ocrResult) && ocrResult.length > 0 ? JSON.stringify(ocrResult) : null;
      success_callback && success_callback({ parentDir, fileName, ocrResult: validResult });
    }).catch(error => {
      const errorMessage = gettext('OCR failed');
      toaster.danger(errorMessage);
      fail_callback && fail_callback();
    });
  }, [repoID]);

  const generateDescription = useCallback(({ parentDir, fileName }, { success_callback, fail_callback } = {}) => {
    const filePath = Utils.joinPath(parentDir, fileName);
    const isImage = Utils.imageCheck(fileName);
    let APIName = '';
    if (Utils.isDescriptionSupportedFile(fileName)) {
      APIName = isImage ? 'imageCaption' : 'generateDescription';
    }
    if (!APIName) return;

    metadataAPI[APIName](repoID, filePath, lang).then(res => {
      const description = res?.data?.summary || res.data.desc || '';
      success_callback && success_callback({ parentDir, fileName, description });
    }).catch(error => {
      const errorMessage = isImage ? gettext('Failed to generate image description') : gettext('Failed to generate description');
      toaster.danger(errorMessage);
      fail_callback && fail_callback();
    });
  }, [repoID]);

  const extractFilesDetails = useCallback((objIds, { success_callback, fail_callback } = {}) => {
    metadataAPI.extractFileDetails(repoID, objIds).then(res => {
      const details = res?.data?.details || [];
      success_callback && success_callback({ details });
    }).catch(error => {
      const errorMessage = gettext('Failed to extract file details');
      toaster.danger(errorMessage);
      fail_callback && fail_callback();
    });
  }, [repoID]);

  const extractFileDetails = useCallback((objId, { success_callback, fail_callback } = {}) => {
    extractFilesDetails([objId], {
      success_callback: ({ details }) => {
        success_callback && success_callback({ detail: details[0] });
      },
      fail_callback
    });
  }, [extractFilesDetails]);

  return (
    <MetadataAIOperationsContext.Provider value={{
      enableMetadata,
      enableOCR,
      enableTags,
      tagsLang,
      canModify,
      onOCR,
      OCRSuccessCallBack,
      generateDescription,
      extractFilesDetails,
      extractFileDetails,
    }}>
      {children}
    </MetadataAIOperationsContext.Provider>
  );
};

export const useMetadataAIOperations = () => {
  const context = useContext(MetadataAIOperationsContext);
  if (!context) {
    throw new Error('\'MetadataAIOperationsContext\' is null');
  }
  return context;
};
