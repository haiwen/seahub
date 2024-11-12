import React, { useContext, useEffect, useCallback, useState, useMemo } from 'react';
import metadataAPI from '../metadata/api';
import { Utils } from '../utils/utils';
import toaster from '../components/toast';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes
const EnableMetadataContext = React.createContext(null);

export const EnableMetadataProvider = ({ repoID, currentRepoInfo, children }) => {
  const enableMetadataManagement = useMemo(() => {
    if (currentRepoInfo?.encrypted) return false;
    return window.app.pageOptions.enableMetadataManagement;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement, currentRepoInfo]);

  const [isLoading, setLoading] = useState(true);
  const [enableMetadata, setEnableMetadata] = useState(false);

  const cancelURLView = useCallback(() => {
    // If attribute extension is turned off, unmark the URL
    const { origin, pathname, search } = window.location;
    const urlParams = new URLSearchParams(search);
    const viewID = urlParams.get('view');
    if (viewID) {
      const url = `${origin}${pathname}`;
      window.history.pushState({ url: url, path: '' }, '', url);
    }
  }, []);

  useEffect(() => {
    if (!enableMetadataManagement) {
      cancelURLView();
      setLoading(false);
      return;
    }
    metadataAPI.getMetadataStatus(repoID).then(res => {
      const enableMetadata = res.data.enabled;
      if (!enableMetadata) {
        cancelURLView();
      }
      setEnableMetadata(enableMetadata);
      setLoading(false);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error, true);
      toaster.danger(errorMsg);
      setEnableMetadata(false);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, enableMetadataManagement]);

  const updateEnableMetadata = useCallback((newValue) => {
    if (newValue === enableMetadata) return;
    if (!newValue) {
      cancelURLView();
    }
    setEnableMetadata(newValue);
  }, [enableMetadata, cancelURLView]);

  return (
    <EnableMetadataContext.Provider value={{ enableMetadataManagement, enableMetadata, updateEnableMetadata }}>
      {!isLoading && children}
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
