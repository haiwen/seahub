import React, { useContext, useEffect, useState } from 'react';
import metadataAPI from '../api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import { seafileAPI } from '../../utils/seafile-api';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes
const EnableMetadataContext = React.createContext(null);

export const EnableMetadataProvider = ({ repoID, children }) => {

  const [enableMetadataManagement, setEnableMetadataManagement] = useState(false);
  const [enableMetadata, setEnableExtendedProperties] = useState(false);

  useEffect(() => {
    seafileAPI.getRepoInfo(repoID).then(res => {
      if (res.data.encrypted) {
        setEnableMetadataManagement(false);
      } else {
        setEnableMetadataManagement(window.app.pageOptions.enableMetadataManagement);
      }
    });
  }, [repoID]);

  useEffect(() => {
    if (!enableMetadataManagement) {
      return;
    }
    metadataAPI.getMetadataStatus(repoID).then(res => {
      const enableMetadata = res.data.enabled;
      setEnableExtendedProperties(enableMetadata);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error, true);
      toaster.danger(errorMsg);
      setEnableExtendedProperties(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, enableMetadataManagement]);

  return (
    <EnableMetadataContext.Provider value={{ enableMetadata }}>
      {children}
    </EnableMetadataContext.Provider>
  );
};

export const useEnableMetadata = () => {
  const context = useContext(EnableMetadataContext);
  if (!context) {
    throw new Error('\'EnableMetadataContext\' is null');
  }
  return context;
};
