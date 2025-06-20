import React, { useContext, useCallback, useMemo, useState, useRef } from 'react';
import metadataAPI from '../api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import { PRIVATE_COLUMN_KEY, EVENT_BUS_TYPE } from '../constants';
import { gettext, lang } from '../../utils/constants';
import { OCRResultPopover } from '../components/popover';
import FileTagsDialog from '../components/dialog/file-tags-dialog';

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
  const [isOcrResultDialogShow, setOcrResultDialogShow] = useState(false);
  const [isFileTagsDialogShow, setFileTagsDialogShow] = useState(false);

  const recordRef = useRef(null);
  const targetRef = useRef(null);
  const opCallBack = useRef(null);

  const permission = useMemo(() => repoInfo.permission !== 'admin' && repoInfo.permission !== 'rw' ? 'r' : 'rw', [repoInfo]);
  const canModify = useMemo(() => permission === 'rw', [permission]);

  const closeFileTagsDialog = useCallback(() => {
    recordRef.current = null;
    opCallBack.current = null;
    setFileTagsDialogShow(false);
  }, []);

  const closeOcrResultDialog = useCallback(() => {
    recordRef.current = null;
    targetRef.current = null;
    opCallBack.current = null;
    setOcrResultDialogShow(false);
  }, []);

  const onOCR = useCallback((record, { success_callback }, target) => {
    targetRef.current = target;
    recordRef.current = record;
    opCallBack.current = success_callback;
    setOcrResultDialogShow(true);
  }, []);

  const onOCRByImageDialog = useCallback(({ parentDir, fileName } = {}, target) => {
    recordRef.current = {
      [PRIVATE_COLUMN_KEY.PARENT_DIR]: parentDir,
      [PRIVATE_COLUMN_KEY.FILE_NAME]: fileName,
    };
    targetRef.current = target;

    opCallBack.current = (description) => {
      const update = { [PRIVATE_COLUMN_KEY.FILE_DESCRIPTION]: description };
      metadataAPI.modifyRecord(repoID, { parentDir, fileName }, update).then(res => {
        const eventBus = window?.sfMetadataContext?.eventBus;
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, { parentDir, fileName }, update);
        eventBus && eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_DETAIL_CHANGED, { parentDir, fileName }, update);
      });
    };
    setOcrResultDialogShow(true);
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
      let errorMessage = gettext('Failed to generate description');
      if (error.status === 429) {
        const err_data = error.response.data;
        errorMessage = gettext(err_data.error_msg);
      }
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

  const faceRecognition = useCallback((objIds, { success_callback, fail_callback } = {}) => {
    const inProgressToaster = toaster.notifyInProgress(gettext('Detecting faces by AI...'), { duration: null });
    metadataAPI.recognizeFaces(repoID, objIds).then(res => {
      inProgressToaster.close();
      toaster.success(gettext('Faces detected'));
      success_callback && success_callback();
    }).catch(error => {
      inProgressToaster.close();
      const errorMessage = gettext('Failed to detect faces');
      toaster.danger(errorMessage);
      fail_callback && fail_callback();
    });
  }, [repoID]);

  const generateFileTags = useCallback((record, { success_callback }) => {
    recordRef.current = record;
    opCallBack.current = success_callback;
    setFileTagsDialogShow(true);
  }, []);

  return (
    <MetadataAIOperationsContext.Provider value={{
      enableMetadata,
      enableOCR,
      enableTags,
      tagsLang,
      canModify,
      onOCR,
      onOCRByImageDialog,
      generateDescription,
      extractFilesDetails,
      extractFileDetails,
      faceRecognition,
      generateFileTags,
    }}>
      {children}
      {isFileTagsDialogShow && (
        <FileTagsDialog record={recordRef.current} onToggle={closeFileTagsDialog} onSubmit={opCallBack.current} />
      )}
      {isOcrResultDialogShow && (
        <OCRResultPopover
          repoID={repoID}
          target={targetRef.current}
          record={recordRef.current}
          onToggle={closeOcrResultDialog}
          saveToDescription={opCallBack.current}
        />
      )}
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
