import React, { useContext, useEffect, useCallback, useState, useMemo } from 'react';
import metadataAPI from '../metadata/api';
import { Utils } from '../utils/utils';
import toaster from '../components/toast';
import Loading from '../components/loading';
import { PRIVATE_FILE_TYPE } from '../constants';
import { EVENT_BUS_TYPE } from '../metadata/constants';
import { enableSeafileAI } from '../utils/constants';


// This hook provides content related to seahub interaction, such as whether to enable extended attributes
const MetadataStatusContext = React.createContext(null);

export const MetadataStatusProvider = ({ repoID, repoInfo, currentPath, hideMetadataView, statusCallback, children }) => {
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
  const [globalHiddenColumns, setGlobalHiddenColumns] = useState([]);

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
        global_hidden_columns: globalHiddenColumns,
      } = res.data;
      if (!enableMetadata) {
        cancelMetadataURL();
      }
      setEnableTags(enableTags);
      setTagsLang(tagsLang || 'en');
      setDetailsSettings(JSON.parse(detailsSettings));
      setEnableOCR(enableSeafileAI && enableOCR);
      setEnableFaceRecognition(enableSeafileAI && enableFaceRecognition);
      setEnableMetadata(enableMetadata);
      const parsedGlobalHiddenColumns = typeof globalHiddenColumns === 'string'
        ? JSON.parse(globalHiddenColumns)
        : (globalHiddenColumns || []);
      setGlobalHiddenColumns(parsedGlobalHiddenColumns);
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
    statusCallback && statusCallback({ enableTags });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableTags]);

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
    setTagsLang('en');
    setEnableTags(newValue);
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

  const modifyGlobalHiddenColumns = useCallback((columns) => {
    metadataAPI.modifyGlobalHiddenColumns(repoID, columns).then(res => {
      setGlobalHiddenColumns(columns);
      const isView = currentPath.startsWith('/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES);
      if (isView) {
        window.sfMetadataContext && window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_TABLE_CHANGED);
      }
    }).catch(error => {
      toaster.danger(Utils.getErrorMsg(error));
      setGlobalHiddenColumns(globalHiddenColumns);
    });
  }, [repoID, currentPath, globalHiddenColumns]);

  if (isLoading) {
    return (
      <div className="metadata-status-loading-container">
        <Loading/>
      </div>
    );
  }

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
        globalHiddenColumns,
        modifyGlobalHiddenColumns,
      }}
    >
      {!isLoading && (
        <>{children}</>
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
