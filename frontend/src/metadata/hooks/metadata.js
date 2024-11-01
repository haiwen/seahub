import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import metadataAPI from '../api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import { gettext } from '../../utils/constants';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { FACE_RECOGNITION_VIEW_ID, VIEW_TYPE } from '../constants';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes, views data, etc.
const MetadataContext = React.createContext(null);

export const MetadataProvider = ({ repoID, currentRepoInfo, hideMetadataView, selectMetadataView, children }) => {
  const enableMetadataManagement = useMemo(() => {
    if (currentRepoInfo.encrypted) return false;
    return window.app.pageOptions.enableMetadataManagement;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.app.pageOptions.enableMetadataManagement, currentRepoInfo]);

  const [enableMetadata, setEnableExtendedProperties] = useState(false);
  const [enableFaceRecognition, setEnableFaceRecognition] = useState(false);
  const [showFirstView, setShowFirstView] = useState(false);
  const [navigation, setNavigation] = useState([]);
  const [staticView, setStaticView] = useState([]);
  const [, setCount] = useState(0);
  const viewsMap = useRef({});

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
      return;
    }
    metadataAPI.getMetadataStatus(repoID).then(res => {
      const enableMetadata = res.data.enabled;
      if (!enableMetadata) {
        cancelURLView();
      }
      setEnableExtendedProperties(enableMetadata);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error, true);
      toaster.danger(errorMsg);
      setEnableExtendedProperties(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, enableMetadataManagement]);

  const updateEnableMetadata = useCallback((newValue) => {
    if (newValue === enableMetadata) return;
    if (!newValue) {
      hideMetadataView && hideMetadataView();
      cancelURLView();
      setEnableFaceRecognition(false);
    } else {
      setShowFirstView(true);
    }
    setEnableExtendedProperties(newValue);
  }, [enableMetadata, hideMetadataView, cancelURLView]);

  const updateEnableFaceRecognition = useCallback((newValue) => {
    if (newValue === enableFaceRecognition) return;
    setEnableFaceRecognition(newValue);
    if (newValue) {
      toaster.success(gettext('Recognizing portraits. Please refresh the page later.'));
    }
  }, [enableFaceRecognition]);

  // views
  useEffect(() => {
    if (enableMetadata) {
      metadataAPI.listViews(repoID).then(res => {
        const { navigation, views } = res.data;
        if (Array.isArray(views)) {
          views.forEach(view => {
            viewsMap.current[view._id] = view;
          });
        }
        viewsMap.current[FACE_RECOGNITION_VIEW_ID] = {
          _id: FACE_RECOGNITION_VIEW_ID,
          name: gettext('Photos - classfied by people'),
          type: VIEW_TYPE.FACE_RECOGNITION,
        };
        setNavigation(navigation);
      }).catch(error => {
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
      });
      return;
    }

    viewsMap.current = {};
    setNavigation([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, enableMetadata]);

  useEffect(() => {
    if (!enableMetadata) {
      setStaticView([]);
      setEnableFaceRecognition(false);
      return;
    }
    metadataAPI.getFaceRecognitionStatus(repoID).then(res => {
      setEnableFaceRecognition(res.data.enabled);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID, enableMetadata]);

  useEffect(() => {
    if (!enableFaceRecognition) {
      setStaticView([]);
      return;
    }
    setStaticView([{ _id: FACE_RECOGNITION_VIEW_ID, type: 'view' }]);
  }, [enableFaceRecognition]);

  const selectView = useCallback((view, isSelected) => {
    if (isSelected) return;
    const isFaceRecognitionView = view.type === PRIVATE_FILE_TYPE.FACE_RECOGNITION;
    const node = {
      children: [],
      path: '/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES + '/' + view._id,
      isExpanded: false,
      isLoaded: true,
      isPreload: true,
      object: {
        file_tags: [],
        id: isFaceRecognitionView ? PRIVATE_FILE_TYPE.FACE_RECOGNITION : PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES,
        name: isFaceRecognitionView ? gettext('Photos - classfied by people') : gettext('File extended properties'),
        type: isFaceRecognitionView ? PRIVATE_FILE_TYPE.FACE_RECOGNITION : PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES,
        isDir: () => false,
      },
      parentNode: {},
      key: repoID,
      view_id: view._id,
      view_type: view.type,
    };
    selectMetadataView(node);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, selectMetadataView]);

  const addView = useCallback((name, type, successCallback, failCallback) => {
    metadataAPI.addView(repoID, name, type).then(res => {
      const view = res.data.view;
      let newNavigation = navigation.slice(0);
      newNavigation.push({ _id: view._id, type: 'view' });
      viewsMap.current[view._id] = view;
      setNavigation(newNavigation);
      selectView(view);
      successCallback && successCallback();
    }).catch(error => {
      failCallback && failCallback(error);
    });
  }, [navigation, repoID, viewsMap, selectView]);

  const duplicateView = useCallback((viewId) => {
    metadataAPI.duplicateView(repoID, viewId).then(res => {
      const view = res.data.view;
      let newNavigation = navigation.slice(0);
      newNavigation.push({ _id: view._id, type: 'view' });
      viewsMap.current[view._id] = view;
      setNavigation(newNavigation);
      selectView(view);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [navigation, repoID, viewsMap, selectView]);

  const deleteView = useCallback((viewId, isSelected) => {
    metadataAPI.deleteView(repoID, viewId).then(res => {
      const newNavigation = navigation.filter(item => item._id !== viewId);
      delete viewsMap.current[viewId];
      setNavigation(newNavigation);
      if (isSelected) {
        const currentViewIndex = navigation.findIndex(item => item._id === viewId);
        const lastViewId = navigation[currentViewIndex - 1]._id;
        const lastView = viewsMap.current[lastViewId];
        selectView(lastView);
      }
    }).catch((error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    }));
  }, [repoID, navigation, selectView, viewsMap]);

  const updateView = useCallback((viewId, update, successCallback, failCallback) => {
    metadataAPI.modifyView(repoID, viewId, update).then(res => {
      const currentView = viewsMap.current[viewId];
      viewsMap.current[viewId] = { ...currentView, ...update };
      setCount(n => n + 1);
      successCallback && successCallback();
    }).catch(error => {
      failCallback && failCallback(error);
    });
  }, [repoID, viewsMap]);

  const moveView = useCallback((sourceViewId, targetViewId) => {
    metadataAPI.moveView(repoID, sourceViewId, targetViewId).then(res => {
      const { navigation } = res.data;
      setNavigation(navigation);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID]);

  return (
    <MetadataContext.Provider value={{
      enableMetadata,
      updateEnableMetadata,
      enableFaceRecognition,
      updateEnableFaceRecognition,
      showFirstView,
      setShowFirstView,
      navigation,
      staticView,
      viewsMap: viewsMap.current,
      selectView,
      addView,
      duplicateView,
      deleteView,
      updateView,
      moveView,
    }}>
      {children}
    </MetadataContext.Provider>
  );
};

export const useMetadata = () => {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error('\'MetadataContext\' is null');
  }
  return context;
};
