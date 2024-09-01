import React, { useContext, useEffect, useMemo, useState } from 'react';
import metadataAPI from '../api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes
const EnableMetadataContext = React.createContext(null);

export const EnableMetadataProvider = ({ repoID, children }) => {
  const enableMetadataManagement = useMemo(() => {
    return window.app.pageOptions.enableMetadataManagement;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement]);

  const [enableMetadata, setEnableExtendedProperties] = useState(false);

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
