import React, { useContext, useEffect, useCallback, useState, useMemo } from 'react';
import metadataAPI from '../metadata/api';
import { Utils } from '../utils/utils';
import toaster from '../components/toast';
import { MetadataOperationsProvider } from './metadata-operation';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes
const MetadataStatusContext = React.createContext(null);

export const MetadataStatusProvider = ({ repoID, currentRepoInfo, hideMetadataView, children }) => {
  const enableMetadataManagement = useMemo(() => {
    if (currentRepoInfo?.encrypted) return false;
    return window.app.pageOptions.enableMetadataManagement;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement, currentRepoInfo]);

  const [isLoading, setLoading] = useState(true);
  const [enableMetadata, setEnableMetadata] = useState(false);
  const [enableTags, setEnableTags] = useState(false);
  const [tagsLang, setTagsLang] = useState('en');
  const [enableOCR, setEnableOCR] = useState(false);
  const [detailsSettings, setDetailsSettings] = useState({});
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
      const {
        enabled: enableMetadata,
        tags_enabled: enableTags,
        tags_lang: tagsLang,
        details_settings: detailsSettings,
        ocr_enabled: enableOCR
      } = res.data;
      if (!enableMetadata) {
        cancelMetadataURL();
      }
      setEnableTags(enableTags);
      setTagsLang(tagsLang || 'en');
      setDetailsSettings(JSON.parse(detailsSettings));
      setEnableOCR(enableOCR);
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
    setDetailsSettings({});
    setIsBeingBuilt(newValue);
    setEnableMetadata(newValue);
  }, [enableMetadata, cancelMetadataURL]);

  const updateEnableTags = useCallback((newValue, lang = 'en') => {
    if (newValue === enableTags && lang === tagsLang) return;
    if (!newValue) {
      cancelMetadataURL();
      hideMetadataView && hideMetadataView();
    }
    setEnableTags(newValue);
    setTagsLang(lang);
  }, [enableTags, tagsLang, cancelMetadataURL, hideMetadataView]);

  const updateEnableOCR = useCallback((newValue) => {
    if (newValue === enableOCR) return;
    setEnableOCR(newValue);
  }, [enableOCR]);

  const modifyDetailsSettings = useCallback((update) => {
    metadataAPI.modifyMetadataDetailsSettings(repoID, update).then(res => {
      const newDetailsSettings = { ...detailsSettings, ...update };
      setDetailsSettings(newDetailsSettings);
    }).catch(error => {
      const newDetailsSettings = { ...detailsSettings, ...update };
      setDetailsSettings(newDetailsSettings);
    });
  }, [repoID, detailsSettings]);

  return (
    <MetadataStatusContext.Provider
      value={{
        enableMetadataManagement,
        enableMetadata,
        isBeingBuilt,
        updateEnableMetadata,
        setIsBeingBuilt,
        enableTags,
        tagsLang,
        updateEnableTags,
        detailsSettings,
        modifyDetailsSettings,
        enableOCR,
        updateEnableOCR,
      }}
    >
      {!isLoading && (
        <MetadataOperationsProvider
          repoID={repoID}
          enableMetadata={enableMetadata}
          enableOCR={enableOCR}
          repoInfo={currentRepoInfo}
        >
          {children}
        </MetadataOperationsProvider>
      )}
    </MetadataStatusContext.Provider>
  );
};

export const useMetadataStatus = () => {
  const context = useContext(MetadataStatusContext);
  if (!context) {
    throw new Error('\'MetadataStatusContext\' is null');
  }
  return context;
};
