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
    if (!ocrResult) return;
    const update = { [PRIVATE_COLUMN_KEY.OCR]: ocrResult };
    metadataAPI.modifyRecord(repoID, { parentDir, fileName }, update).then(res => {
      const eventBus = window?.sfMetadataContext?.eventBus;
      eventBus && eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, { parentDir, fileName }, update);
    });
  }, [repoID]);

  const onOCR = useCallback(({ parentDir, fileName }, { success_callback, fail_callback } = {}) => {
    const filePath = Utils.joinPath(parentDir, fileName);
    const inProgressToaster = toaster.notifyInProgress(gettext('Extracting text by AI...'), { duration: null });
    metadataAPI.ocr(repoID, filePath).then(res => {
      const ocrResult = res.data.ocr_result;
      const validResult = Array.isArray(ocrResult) && ocrResult.length > 0 ? JSON.stringify(ocrResult) : null;
      inProgressToaster.close();
      toaster.success(gettext('Text extracted'));
      success_callback && success_callback({ parentDir, fileName, ocrResult: validResult });
    }).catch(error => {
      inProgressToaster.close();
      const errorMessage = gettext('Failed to extract text');
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
    const inProgressToaster = toaster.notifyInProgress(gettext('Generating description by AI...'), { duration: null });
    metadataAPI[APIName](repoID, filePath, lang).then(res => {
      const description = res?.data?.summary || res.data.desc || '';
      inProgressToaster.close();
      toaster.success(gettext('Description generated'));
      success_callback && success_callback({ parentDir, fileName, description });
    }).catch(error => {
      inProgressToaster.close();
      const errorMessage = gettext('Failed to generate description');
      toaster.danger(errorMessage);
      fail_callback && fail_callback();
    });
  }, [repoID]);

  const genDualLayerPDF = useCallback(({ parentDir, fileName }, { success_callback, fail_callback } = {}) => {
    const filePath = Utils.joinPath(parentDir, fileName);
    const inProgressToaster = toaster.notifyInProgress(gettext('Making PDF searchable by AI...'), { duration: 5 });
    metadataAPI.genDualLayerPDF(repoID, filePath).then(res => {
      if (res.data.task_status === 'processing') {
        toaster.notifyInProgress(gettext('The task has been started, perhaps by another user'), { duration: 5 });
      } else if (res.data.task_status === 'already_ocr') {
        const userConfirmed = window.confirm(gettext('The text has already been OCR processed. Do you want to proceed with OCR again?'));
        if (userConfirmed) {
          metadataAPI.genDualLayerPDF(repoID, filePath, { force: true }).then(res => {
            if (res.data.task_status === 'processing') {
              toaster.notifyInProgress(gettext('The task has been started, perhaps by another user'), { duration: 5 });
            } else {
              success_callback && success_callback();
            }
          }).catch(() => {
            const errorMessage = gettext('Failed to make PDF searchable');
            toaster.danger(errorMessage);
            fail_callback && fail_callback();
          });
        }
      } else {
        success_callback && success_callback();
      }
    }).catch(() => {
      inProgressToaster.close();
      const errorMessage = gettext('Failed to make PDF searchable');
      toaster.danger(errorMessage);
      fail_callback && fail_callback();
    });
  }, [repoID]);

  const extractFilesDetails = useCallback((objIds, { success_callback, fail_callback } = {}) => {
    const inProgressToaster = toaster.notifyInProgress(gettext('Extracting file details by AI...'), { duration: null });
    metadataAPI.extractFileDetails(repoID, objIds).then(res => {
      const details = res?.data?.details || [];
      inProgressToaster.close();
      toaster.success(gettext('File details extracted'));
      success_callback && success_callback({ details });
    }).catch(error => {
      inProgressToaster.close();
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
      genDualLayerPDF,
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
