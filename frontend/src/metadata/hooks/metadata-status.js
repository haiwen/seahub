import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import metadataAPI from '../api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';

const MetadataStatusContext = React.createContext(null);

export const MetadataStatusProvider = ({ repoID, hideMetadataView, children }) => {
  const enableMetadataManagement = useMemo(() => {
    return window.app.pageOptions.enableMetadataManagement;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement]);

  const [enableMetadata, setEnableExtendedProperties] = useState(false);
  const [showFirstView, setShowFirstView] = useState(false);

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

  const updateEnableMetadata = useCallback((newValue) => {
    if (newValue === enableMetadata) return;
    if (!newValue) {
      hideMetadataView && hideMetadataView();
    } else {
      setShowFirstView(true);
    }
    setEnableExtendedProperties(newValue);
  }, [enableMetadata, hideMetadataView]);

  return (
    <MetadataStatusContext.Provider value={{ enableMetadata, updateEnableMetadata, showFirstView, setShowFirstView }}>
      {children}
    </MetadataStatusContext.Provider>
  );
};

export const useMetadataStatus = () => {
  const context = useContext(MetadataStatusContext);
  if (!context) {
    throw new Error('\'MetadataStatusContext\' is null');
  }
  const { enableMetadata, updateEnableMetadata, showFirstView, setShowFirstView } = context;
  return { enableMetadata, updateEnableMetadata, showFirstView, setShowFirstView };
};
