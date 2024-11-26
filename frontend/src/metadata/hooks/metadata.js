import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import metadataAPI from '../api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import { gettext } from '../../utils/constants';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { FACE_RECOGNITION_VIEW_ID, VIEW_TYPE } from '../constants';
import { useMetadataStatus } from '../../hooks';
import { updateFavicon } from '../utils/favicon';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes, views data, etc.
const MetadataContext = React.createContext(null);

export const MetadataProvider = ({ repoID, currentPath, repoInfo, hideMetadataView, selectMetadataView, children }) => {
  const [isLoading, setLoading] = useState(true);
  const [enableFaceRecognition, setEnableFaceRecognition] = useState(false);
  const [navigation, setNavigation] = useState([]);
  const [staticView, setStaticView] = useState([]);
  const [, setCount] = useState(0);

  const viewsMap = useRef({});
  const originalTitleRef = useRef(document.title);

  const { enableMetadata, isBeingBuilt, setIsBeingBuilt } = useMetadataStatus();

  const updateEnableFaceRecognition = useCallback((newValue) => {
    if (newValue === enableFaceRecognition) return;
    setEnableFaceRecognition(newValue);
    if (newValue) {
      toaster.success(gettext('Recognizing portraits. Please refresh the page later.'));
    }
  }, [enableFaceRecognition]);

  // views
  useEffect(() => {
    setLoading(true);
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
          name: gettext('Photos - classified by people'),
          type: VIEW_TYPE.FACE_RECOGNITION,
        };
        setNavigation(navigation);
        setLoading(false);
      }).catch(error => {
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
        setLoading(false);
      });
      return;
    }
    hideMetadataView && hideMetadataView();
    setEnableFaceRecognition(false);
    viewsMap.current = {};
    setStaticView([]);
    setNavigation([]);
    setLoading(false);
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
    const node = {
      children: [],
      path: '/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES + '/' + view._id,
      isExpanded: false,
      isLoaded: true,
      isPreload: true,
      object: {
        file_tags: [],
        id: view._id,
        type: PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES,
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

  useEffect(() => {
    if (isLoading) return;
    if (isBeingBuilt) {
      const firstViewObject = navigation.find(item => item.type === 'view');
      const firstView = firstViewObject ? viewsMap.current[firstViewObject._id] : '';
      if (firstView) {
        selectView(firstView);
      }
      return;
    }
    const { origin, pathname, search } = window.location;
    const urlParams = new URLSearchParams(search);
    if (!urlParams.has('view')) return;
    const viewID = urlParams.get('view');
    if (viewID) {
      const lastOpenedView = viewsMap.current[viewID] || '';
      if (lastOpenedView) {
        selectView(lastOpenedView);
        return;
      }
      const url = `${origin}${pathname}`;
      window.history.pushState({ url: url, path: '' }, '', url);
    }

    const firstViewObject = navigation.find(item => item.type === 'view');
    const firstView = firstViewObject ? viewsMap.current[firstViewObject._id] : '';
    if (firstView) {
      selectView(firstView);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isBeingBuilt]);

  useEffect(() => {
    if (!currentPath.includes('/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES + '/')) return;
    const currentViewId = currentPath.split('/').pop();
    const currentView = viewsMap.current[currentViewId];
    if (currentView) {
      document.title = `${currentView.name} - Seafile`;
      updateFavicon(currentView.type);
      return;
    }
    document.title = originalTitleRef.current;
    updateFavicon('default');
  }, [currentPath, viewsMap]);

  return (
    <MetadataContext.Provider value={{
      enableFaceRecognition,
      updateEnableFaceRecognition,
      isBeingBuilt,
      setIsBeingBuilt,
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
