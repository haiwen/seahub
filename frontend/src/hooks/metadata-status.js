import React, { useContext, useEffect, useCallback, useState, useMemo } from 'react';
import metadataAPI from '../metadata/api';
import { Utils } from '../utils/utils';
import toaster from '../components/toast';
import Loading from '../components/loading';
import { PRIVATE_FILE_TYPE } from '../constants';
import { EVENT_BUS_TYPE } from '../metadata/constants';
import { enableSeafileAI, gettext } from '../utils/constants';


// This hook provides content related to seahub interaction, such as whether to enable extended attributes
const MetadataStatusContext = React.createContext(null);

// 元数据状态管理
export const MetadataStatusProvider = ({ repoID, repoInfo, currentPath, hideMetadataView, statusCallback, children }) => {
  // 是否后端支持元数据管理
  // 加密的资料库不支持元数据，其他的资料库从全局读取（实际上有些会判断错误，需要注意）
  const enableMetadataManagement = useMemo(() => {
    if (repoInfo?.encrypted) return false;
    return window.app.pageOptions.enableMetadataManagement;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement, repoInfo]);

  const [isLoading, setLoading] = useState(true);

  // 当前资料库是否开启元数据
  const [enableMetadata, setEnableMetadata] = useState(false);
  const [globalHiddenColumns, setGlobalHiddenColumns] = useState([]);

  // 是否开启标签管理（标签语言等等）
  const [enableTags, setEnableTags] = useState(false);
  const [tagsLang, setTagsLang] = useState('en');

  const [enableFaceRecognition, setEnableFaceRecognition] = useState(false);

  const [showView, setShowView] = useState(false);
  const [detailsSettings, setDetailsSettings] = useState({});

  // 是否正在构建中（可能是正在提取元数据信息中）
  const [isBeingBuilt, setIsBeingBuilt] = useState(false);

  // 取消元数据 URL
  // 如果是元数据的路径，那么隐藏元数据（从其他地方点进元数据，但是当前资料库没有开启元数据的情况）
  const cancelMetadataURL = useCallback((isSetRoot = false) => {
    // If attribute extension is turned off, unmark the URL
    const { origin, pathname, search } = window.location;
    // 获取当前搜索部分 URL
    const urlParams = new URLSearchParams(search);
    const param = urlParams.get('view') || urlParams.get('tag');
    if (param) {
      const url = `${origin}${pathname}`;
      window.history.pushState({ url: url, path: '' }, '', url);
    }
    hideMetadataView && hideMetadataView(Boolean(param) || isSetRoot);
  }, [hideMetadataView]);

  // 切换资料库时
  useEffect(() => {
    // 先设置都为 false
    setLoading(true);
    setEnableMetadata(false);
    setEnableTags(false);
    setEnableFaceRecognition(false);
    setDetailsSettings({});
    setIsBeingBuilt(false);
    // 先从后端判断是否开启元数据
    if (!enableMetadataManagement) {
      cancelMetadataURL();
      setLoading(false);
      return;
    }
    // Fetch metadata status first
    metadataAPI.getMetadataStatus(repoID).then(res => {
      const {
        enabled: enableMetadata,
        tags_enabled: enableTags,
        show_view: showView,
        tags_lang: tagsLang,
        details_settings: detailsSettings,
        face_recognition_enabled: enableFaceRecognition,
        global_hidden_columns: globalHiddenColumns,
      } = res.data;
      // 然后改成设置
      if (!enableMetadata) {
        cancelMetadataURL();
      }
      setEnableTags(enableTags);
      setShowView(showView);
      setTagsLang(tagsLang || 'en');
      setDetailsSettings(JSON.parse(detailsSettings));
      setEnableFaceRecognition(enableSeafileAI && enableFaceRecognition);
      setEnableMetadata(enableMetadata);
      const parsedGlobalHiddenColumns = typeof globalHiddenColumns === 'string'
        ? JSON.parse(globalHiddenColumns)
        : (globalHiddenColumns || []);
      setGlobalHiddenColumns(parsedGlobalHiddenColumns);

      // Then check records count limit separately
      metadataAPI.checkRecordsFileCount(repoID).then(res2 => {
        const { exceed_limit: exceedLimit, md_file_count_limit: mdFileCountLimit } = res2.data;
        if (exceedLimit) {
          let msg = gettext('The number of metadata records exceeds the limit of {mdFileCountLimit} files.').replace('{mdFileCountLimit}', mdFileCountLimit);
          toaster.warning(msg, { hasCloseButton: true, duration: 5 });
        }
        setLoading(false);
      }).catch(error2 => {
        // If check fails, log and continue; show error if it's critical
        const errorMsg = Utils.getErrorMsg(error2, true);
        toaster.danger(errorMsg);
        setLoading(false);
      });

    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error, true);
      toaster.danger(errorMsg);
      setEnableMetadata(false);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, enableMetadataManagement]);

  // 状态回调函数：当是否开启标签功能后，调用回调函数
  useEffect(() => {
    statusCallback && statusCallback({ enableTags, enableMetadata, showView });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableTags, enableMetadata, showView]);

  // 当元数据开启关闭时，改变其他的属性（元数据优先级高于其他属性，所以关闭时，同步关闭其他属性）
  const updateEnableMetadata = useCallback((newValue) => {
    if (newValue === enableMetadata) return;
    if (!newValue) {
      cancelMetadataURL(true);
      setEnableTags(false);
      setEnableFaceRecognition(false);
    }
    setDetailsSettings({});
    setIsBeingBuilt(newValue);
    setEnableMetadata(newValue);
    setTagsLang('en');
    setEnableTags(newValue);
    setShowView(newValue);
  }, [enableMetadata, cancelMetadataURL]);

  // 更新是否开启标签
  const updateEnableTags = useCallback((newValue, lang = 'en') => {
    if (newValue === enableTags && lang === tagsLang) return;
    if (!newValue) {
      cancelMetadataURL();
    }
    setEnableTags(newValue);
    setTagsLang(lang);
  }, [enableTags, tagsLang, cancelMetadataURL]);


  // 更新是否开启人脸识别
  const updateEnableFaceRecognition = useCallback((newValue) => {
    if (newValue === enableFaceRecognition) return;
    setEnableFaceRecognition(newValue);
  }, [enableFaceRecognition]);

  // 更改细节设置（具体设置项是一个对象）
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

  // 然后套两层返回
  return (
    <MetadataStatusContext.Provider
      value={{
        enableMetadataManagement,
        enableMetadata,
        isBeingBuilt,
        setIsBeingBuilt,
        updateEnableMetadata,
        enableTags,
        showView,
        tagsLang,
        updateEnableTags,
        detailsSettings,
        modifyDetailsSettings,
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
