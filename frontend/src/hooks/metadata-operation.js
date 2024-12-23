import React, { useContext, useCallback, useMemo } from 'react';
import metadataAPI from '../metadata/api';
import { Utils } from '../utils/utils';
import toaster from '../components/toast';
import { PRIVATE_COLUMN_KEY, EVENT_BUS_TYPE } from '../metadata/constants';
import { gettext } from '../utils/constants';

// This hook provides content related to metadata record operation
const MetadataOperationsContext = React.createContext(null);

export const MetadataOperationsProvider = ({ repoID, enableMetadata, enableOCR, repoInfo, children }) => {
  const permission = useMemo(() => repoInfo.permission !== 'admin' && repoInfo.permission !== 'rw' ? 'r' : 'rw', [repoInfo]);
  const canModify = useMemo(() => permission === 'rw', [permission]);

  const onOCR = useCallback((parentDir, fileName) => {
    const filePath = Utils.joinPath(parentDir, fileName);
    metadataAPI.ocr(repoID, filePath).then(res => {
      const ocrResult = res.data.ocr_result;
      const validResult = Array.isArray(ocrResult) && ocrResult.length > 0 ? JSON.stringify(ocrResult) : null;
      toaster.success(gettext('Successfully OCR'));
      if (validResult) {
        const update = { [PRIVATE_COLUMN_KEY.OCR]: validResult };
        metadataAPI.modifyRecord(repoID, { parentDir, fileName }, update).then(res => {
          const eventBus = window?.sfMetadataContext?.eventBus;
          if (eventBus) {
            eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, { parentDir, fileName }, update);
          }
        });
      }
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error);
      toaster.danger(errorMessage);
    });
  }, [repoID]);

  let value = {};
  if (canModify && enableMetadata && enableOCR) {
    value['onOCR'] = onOCR;
  }

  return (
    <MetadataOperationsContext.Provider value={value}>
      {children}
    </MetadataOperationsContext.Provider>
  );
};

export const useMetadataOperations = () => {
  const context = useContext(MetadataOperationsContext);
  if (!context) {
    throw new Error('\'MetadataOperationsContext\' is null');
  }
  return context;
};
