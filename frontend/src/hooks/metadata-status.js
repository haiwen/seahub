import React, { useContext, useEffect, useCallback, useState, useMemo } from 'react';
import metadataAPI from '../metadata/api';
import { Utils } from '../utils/utils';
import toaster from '../components/toast';
import { MetadataAIOperationsProvider } from './metadata-ai-operation';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes
const MetadataStatusContext = React.createContext(null);

export const MetadataStatusProvider = ({ repoID, repoInfo, hideMetadataView, statusCallback, children }) => {
  const enableMetadataManagement = useMemo(() => {
    if (repoInfo?.encrypted) return false;
    return window.app.pageOptions.enableMetadataManagement;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement, repoInfo]);

  const [isLoading, setLoading] = useState(true);
  const [enableMetadata, setEnableMetadata] = useState(false);
  const [enableTags, setEnableTags] = useState(false);
  const [tagsLang, setTagsLang] = useState('en');
  const [enableOCR, setEnableOCR] = useState(false);
  const [detailsSettings, setDetailsSettings] = useState({});
  const [isBeingBuilt, setIsBeingBuilt] = useState(false);
  const [enableFaceRecognition, setEnableFaceRecognition] = useState(false);

  const cancelMetadataURL = useCallback((isSetRoot = false) => {
    // If attribute extension is turned off, unmark the URL
    const { origin, pathname, search } = window.location;
    const urlParams = new URLSearchParams(search);
    const param = urlParams.get('view') || urlParams.get('tag');
    if (param) {
      const url = `${origin}${pathname}`;
      window.history.pushState({ url: url, path: '' }, '', url);
    }
    hideMetadataView && hideMetadataView(Boolean(param) || isSetRoot);
  }, [hideMetadataView]);

  useEffect(() => {
    setLoading(true);
    setEnableMetadata(false);
    setEnableTags(false);
    setEnableOCR(false);
    setEnableFaceRecognition(false);
    setDetailsSettings({});
    setIsBeingBuilt(false);
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
        ocr_enabled: enableOCR,
        face_recognition_enabled: enableFaceRecognition,
      } = res.data;
      if (!enableMetadata) {
        cancelMetadataURL();
      }
      setEnableTags(enableTags);
      setTagsLang(tagsLang || 'en');
      setDetailsSettings(JSON.parse(detailsSettings));
      setEnableOCR(enableOCR);
      setEnableFaceRecognition(enableFaceRecognition);
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

  useEffect(() => {
    statusCallback && statusCallback({ enableMetadata, enableTags });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableMetadata, enableTags]);

  const updateEnableMetadata = useCallback((newValue) => {
    if (newValue === enableMetadata) return;
    if (!newValue) {
      cancelMetadataURL(true);
      setEnableTags(false);
      setEnableOCR(false);
      setEnableFaceRecognition(false);
    }
    setDetailsSettings({});
    setIsBeingBuilt(newValue);
    setEnableMetadata(newValue);
  }, [enableMetadata, cancelMetadataURL]);

  const updateEnableTags = useCallback((newValue, lang = 'en') => {
    if (newValue === enableTags && lang === tagsLang) return;
    if (!newValue) {
      cancelMetadataURL(true);
    }
    setEnableTags(newValue);
    setTagsLang(lang);
  }, [enableTags, tagsLang, cancelMetadataURL]);

  const updateEnableOCR = useCallback((newValue) => {
    if (newValue === enableOCR) return;
    setEnableOCR(newValue);
  }, [enableOCR]);

  const updateEnableFaceRecognition = useCallback((newValue) => {
    if (newValue === enableFaceRecognition) return;
    setEnableFaceRecognition(newValue);
  }, [enableFaceRecognition]);

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
        enableFaceRecognition,
        updateEnableFaceRecognition,
      }}
    >
      {!isLoading && (
        <MetadataAIOperationsProvider
          repoID={repoID}
          enableMetadata={enableMetadata}
          enableOCR={enableOCR}
          enableTags={enableTags}
          tagsLang={tagsLang}
          repoInfo={repoInfo}
        >
          {children}
        </MetadataAIOperationsProvider>
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
