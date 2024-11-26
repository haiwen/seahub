import React, { useContext, useEffect, useCallback, useState, useMemo } from 'react';
import metadataAPI from '../metadata/api';
import { Utils } from '../utils/utils';
import toaster from '../components/toast';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes
const EnableMetadataContext = React.createContext(null);

export const MetadataStatusProvider = ({ repoID, currentRepoInfo, hideMetadataView, children }) => {
  const enableMetadataManagement = useMemo(() => {
    if (currentRepoInfo?.encrypted) return false;
    return window.app.pageOptions.enableMetadataManagement;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement, currentRepoInfo]);

  const [isLoading, setLoading] = useState(true);
  const [enableMetadata, setEnableMetadata] = useState(false);
  const [enableTags, setEnableTags] = useState(false);
  const [isBeingBuilt, setIsBeingBuilt] = useState(false);

  const cancelMetadataURL = useCallback(() => {
    // If attribute extension is turned off, unmark the URL
    const { origin, pathname, search } = window.location;
    const urlParams = new URLSearchParams(search);
    const param = urlParams.get('view') || urlParams.get('tag');
    if (param) {
      const url = `${origin}${pathname}`;
      window.history.pushState({ url: url, path: '' }, '', url);
    }
  }, []);

  useEffect(() => {
    if (!enableMetadataManagement) {
      cancelMetadataURL();
      setLoading(false);
      return;
    }
    metadataAPI.getMetadataStatus(repoID).then(res => {
      const { enabled: enableMetadata, tags_enabled: enableTags } = res.data;
      if (!enableMetadata) {
        cancelMetadataURL();
      }
      setEnableTags(enableTags);
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
      cancelMetadataURL();
      setEnableTags(false);
    }
    setIsBeingBuilt(newValue);
    setEnableMetadata(newValue);
  }, [enableMetadata, cancelMetadataURL]);

  const updateEnableTags = useCallback((newValue) => {
    if (newValue === enableTags) return;
    if (!newValue) {
      cancelMetadataURL();
      hideMetadataView && hideMetadataView();
    }
    setEnableTags(newValue);
  }, [enableTags, cancelMetadataURL, hideMetadataView]);

  return (
    <EnableMetadataContext.Provider
      value={{
        enableMetadataManagement,
        enableMetadata,
        isBeingBuilt,
        updateEnableMetadata,
        setIsBeingBuilt,
        enableTags,
        updateEnableTags,
      }}
    >
      {!isLoading && children}
    </EnableMetadataContext.Provider>
  );
};

export const useMetadataStatus = () => {
  const context = useContext(EnableMetadataContext);
  if (!context) {
    throw new Error('\'EnableMetadataContext\' is null');
  }
  return context;
};
