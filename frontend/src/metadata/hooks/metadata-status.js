import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import metadataAPI from '../api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';

const MetadataStatusContext = React.createContext(null);

export const MetadataStatusProvider = ({ repoID, children }) => {
  const enableMetadataManagement = useMemo(() => {
    return window.app.pageOptions.enableMetadataManagement;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement]);


  const [enableExtendedProperties, setEnableExtendedProperties] = useState(false);

  useEffect(() => {
    if (!enableMetadataManagement) {
      setEnableExtendedProperties(false);
      return;
    }
    metadataAPI.getMetadataStatus(repoID).then(res => {
      setEnableExtendedProperties(res.data.enabled);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error, true);
      toaster.danger(errorMsg);
      setEnableExtendedProperties(false);
    });
  }, [repoID, enableMetadataManagement]);

  const updateEnableExtendedProperties = useCallback((newValue) => {
    if (newValue === enableExtendedProperties) return;
    setEnableExtendedProperties(newValue);
  }, [enableExtendedProperties]);

  return (
    <MetadataStatusContext.Provider value={{ enableExtendedProperties, updateEnableExtendedProperties }}>
      {children}
    </MetadataStatusContext.Provider>
  );
};

export const useMetadataStatus = () => {
  const context = useContext(MetadataStatusContext);
  if (!context) {
    throw new Error('\'MetadataStatusContext\' is null');
  }
  const { enableExtendedProperties, updateEnableExtendedProperties } = context;
  return { enableExtendedProperties, updateEnableExtendedProperties };
};
