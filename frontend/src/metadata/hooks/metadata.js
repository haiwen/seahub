import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import metadataAPI from '../api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Folder from '../model/metadata/folder';
import { gettext } from '../../utils/constants';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { FACE_RECOGNITION_VIEW_ID, VIEW_TYPE, VIEWS_TYPE_FOLDER, VIEWS_TYPE_VIEW } from '../constants';
import { useMetadataStatus } from '../../hooks';
import { updateFavicon } from '../utils/favicon';
import { getViewName } from '../utils/view';

const CACHED_COLLAPSED_FOLDERS_PREFIX = 'sf-metadata-collapsed-folders';

// This hook provides content related to seahub interaction, such as whether to enable extended attributes, views data, etc.
const MetadataContext = React.createContext(null);

export const MetadataProvider = ({ repoID, currentPath, repoInfo, selectMetadataView, children }) => {
  const [isLoading, setLoading] = useState(true);
  const [enableFaceRecognition, setEnableFaceRecognition] = useState(false);
  const [navigation, setNavigation] = useState([]);
  const [idViewMap, setIdViewMap] = useState({});

  const collapsedFoldersIds = useRef([]);
  const originalTitleRef = useRef(document.title);

  const { enableMetadata, isBeingBuilt, setIsBeingBuilt } = useMetadataStatus();

  const getCollapsedFolders = useCallback(() => {
    const strFoldedFolders = window.localStorage.getItem(`${CACHED_COLLAPSED_FOLDERS_PREFIX}-${repoID}`);
    const foldedFolders = strFoldedFolders && JSON.parse(strFoldedFolders);
    return Array.isArray(foldedFolders) ? foldedFolders : [];
  }, [repoID]);

  const setCollapsedFolders = useCallback((collapsedFoldersIds) => {
    window.localStorage.setItem(`${CACHED_COLLAPSED_FOLDERS_PREFIX}-${repoID}`, JSON.stringify(collapsedFoldersIds));
  }, [repoID]);

  const addViewIntoMap = useCallback((viewId, view) => {
    let updatedIdViewInMap = { ...idViewMap };
    updatedIdViewInMap[viewId] = view;
    setIdViewMap(updatedIdViewInMap);
  }, [idViewMap]);

  const deleteViewFromMap = useCallback((viewId) => {
    let updatedIdViewInMap = { ...idViewMap };
    delete updatedIdViewInMap[viewId];
    setIdViewMap(updatedIdViewInMap);
  }, [idViewMap]);

  // views
  useEffect(() => {
    setLoading(true);
    if (enableMetadata) {
      metadataAPI.listViews(repoID).then(res => {
        const { navigation, views } = res.data;
        if (Array.isArray(views)) {
          let idViewMap = {};
          views.forEach(view => {
            idViewMap[view._id] = { ...view, name: getViewName(view) };
          });
          setIdViewMap(idViewMap);
        }
        setNavigation(navigation);
        setLoading(false);
      }).catch(error => {
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
        setLoading(false);
      });
      return;
    }
    setEnableFaceRecognition(false);
    setNavigation([]);
    setIdViewMap({});
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableMetadata]);

  useEffect(() => {
    if (!enableMetadata) {
      setEnableFaceRecognition(false);
      return;
    }
    metadataAPI.getFaceRecognitionStatus(repoID).then(res => {
      setEnableFaceRecognition(res.data.enabled);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableMetadata]);

  const getFirstView = useCallback(() => {
    const firstViewNav = navigation.find(item => item.type === VIEWS_TYPE_VIEW);
    const firstView = firstViewNav ? idViewMap[firstViewNav._id] : null;
    if (!firstView && Object.keys(idViewMap).length > 0) {
      return idViewMap[Object.keys(idViewMap)[0]];
    }
    return firstView;
  }, [navigation, idViewMap]);

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

  useEffect(() => {
    collapsedFoldersIds.current = getCollapsedFolders();
  }, [getCollapsedFolders]);

  const collapseFolder = useCallback((folderId) => {
    let updatedCollapsedFoldersIds = getCollapsedFolders();
    if (updatedCollapsedFoldersIds.includes(folderId)) {
      return;
    }
    updatedCollapsedFoldersIds.push(folderId);
    setCollapsedFolders(updatedCollapsedFoldersIds);
  }, [getCollapsedFolders, setCollapsedFolders]);

  const expandFolder = useCallback((folderId) => {
    let updatedCollapsedFoldersIds = getCollapsedFolders();
    if (!updatedCollapsedFoldersIds.includes(folderId)) {
      return;
    }
    updatedCollapsedFoldersIds = updatedCollapsedFoldersIds.filter((collapsedFolderId) => collapsedFolderId !== folderId);
    setCollapsedFolders(updatedCollapsedFoldersIds);
  }, [getCollapsedFolders, setCollapsedFolders]);

  const addFolder = useCallback((name, successCallback, failCallback) => {
    metadataAPI.addFolder(repoID, name).then(res => {
      let newNavigation = [...navigation];
      const folder = new Folder(res.data.folder);
      newNavigation.push(folder);
      setNavigation(newNavigation);
      successCallback && successCallback();
    }).catch(error => {
      failCallback && failCallback(error);
    });
  }, [repoID, navigation]);

  const modifyFolder = useCallback((folderId, updates, successCallback, failCallback) => {
    metadataAPI.modifyFolder(repoID, folderId, updates).then(res => {
      let newNavigation = [...navigation];
      let folderIndex = newNavigation.findIndex((nav) => nav._id === folderId && nav.type === VIEWS_TYPE_FOLDER);
      if (folderIndex < 0) {
        return;
      }
      const validUpdates = { ...updates };
      delete validUpdates._id;
      delete validUpdates.type;
      delete validUpdates.children;
      let updatedFolder = newNavigation[folderIndex];
      updatedFolder = Object.assign({}, updatedFolder, validUpdates);
      newNavigation[folderIndex] = updatedFolder;
      setNavigation(newNavigation);
      successCallback && successCallback();
    }).catch(error => {
      failCallback && failCallback(error);
    });
  }, [repoID, navigation]);

  const deleteFolder = useCallback((folderId) => {
    metadataAPI.deleteFolder(repoID, folderId).then(res => {
      let newNavigation = [...navigation];
      let folderIndex = newNavigation.findIndex((nav) => nav._id === folderId && nav.type === VIEWS_TYPE_FOLDER);
      if (folderIndex < 0) {
        return;
      }
      const viewsInFolder = newNavigation[folderIndex].children;
      newNavigation.splice(folderIndex, 1);
      if (viewsInFolder.length > 0) {
        newNavigation.push(...viewsInFolder);
      }
      setNavigation(newNavigation);
    }).catch((error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    }));
  }, [repoID, navigation]);

  const addViewCallback = useCallback((view, folderId) => {
    const newViewNav = { _id: view._id, type: VIEWS_TYPE_VIEW };
    let newNavigation = [...navigation];
    if (folderId) {
      // add view into folder
      const folderIndex = newNavigation.findIndex((nav) => nav._id === folderId && nav.type === VIEWS_TYPE_FOLDER);
      if (folderIndex < 0) {
        return;
      }
      let updatedFolder = newNavigation[folderIndex];
      updatedFolder.children = Array.isArray(updatedFolder.children) ? updatedFolder.children : [];
      updatedFolder.children.push(newViewNav);
    } else {
      newNavigation.push(newViewNav);
    }
    const newView = { ...view, name: getViewName(view) };
    addViewIntoMap(newView._id, newView);
    setNavigation(newNavigation);
    selectView(newView);
  }, [navigation, addViewIntoMap, setNavigation, selectView]);

  const addView = useCallback(({ folderId, name, type, successCallback, failCallback }) => {
    metadataAPI.addView(repoID, name, type, folderId).then(res => {
      const view = res.data.view;
      addViewCallback(view, folderId);
      successCallback && successCallback();
    }).catch(error => {
      failCallback && failCallback(error);
    });
  }, [repoID, addViewCallback]);

  const duplicateView = useCallback(({ folderId, viewId }) => {
    metadataAPI.duplicateView(repoID, viewId, folderId).then(res => {
      const view = res.data.view;
      addViewCallback(view, folderId);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID, addViewCallback]);

  const deleteView = useCallback(({ folderId, viewId, isSelected }) => {
    metadataAPI.deleteView(repoID, viewId, folderId).then(res => {
      let newNavigation = [...navigation];
      let prevViewNav = null;
      if (folderId) {
        let folderIndex = newNavigation.findIndex((nav) => nav._id === folderId && nav.type === VIEWS_TYPE_FOLDER);
        if (folderIndex < 0) {
          return;
        }
        let updatedFolder = newNavigation[folderIndex];
        if (!Array.isArray(updatedFolder.children) || updatedFolder.children.length === 0) {
          return;
        }
        const currentViewIndex = updatedFolder.children.findIndex((viewNav) => viewNav._id === viewId);
        prevViewNav = updatedFolder.children[currentViewIndex - 1];
        updatedFolder.children = updatedFolder.children.filter(viewNav => viewNav._id !== viewId);
      } else {
        const currentViewIndex = newNavigation.findIndex(item => item._id === viewId);
        prevViewNav = newNavigation[currentViewIndex - 1];
        newNavigation = newNavigation.filter(nav => nav._id !== viewId);
      }

      setNavigation(newNavigation);
      deleteViewFromMap(viewId);

      // re-select the previous view
      if (isSelected) {
        let prevView = null;
        if (prevViewNav && prevViewNav.type === VIEWS_TYPE_VIEW) {
          prevView = idViewMap[prevViewNav._id];
        }
        if (!prevView) {
          prevView = getFirstView();
        }
        selectView(prevView);
      }
    }).catch((error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    }));
  }, [repoID, navigation, idViewMap, deleteViewFromMap, getFirstView, selectView]);

  const updateView = useCallback((viewId, update, successCallback, failCallback) => {
    metadataAPI.modifyView(repoID, viewId, update).then(res => {
      const currentView = idViewMap[viewId];
      addViewIntoMap(viewId, { ...currentView, ...update });
      successCallback && successCallback();
    }).catch(error => {
      failCallback && failCallback(error);
    });
  }, [repoID, idViewMap, addViewIntoMap]);

  const moveView = useCallback(({ sourceViewId, sourceFolderId, targetViewId, targetFolderId, isAboveFolder }) => {
    if (
      (!sourceViewId && !sourceFolderId) // must drag view or folder
      || (!targetViewId && !targetFolderId) // must move above to view/folder or move view into folder
      || (sourceViewId === targetViewId && sourceFolderId === targetFolderId) // not changed
      || (!sourceViewId && sourceFolderId && targetViewId && targetFolderId) // not allowed to drag folder into folder
    ) {
      return;
    }
    metadataAPI.moveView(repoID, sourceViewId, sourceFolderId, targetViewId, targetFolderId, isAboveFolder).then(res => {
      let newNavigation = [...navigation];

      // remove folder/view from old position
      let updatedSourceNavList = null;
      let sourceId = null;
      if (sourceFolderId) {
        if (sourceViewId) {
          // drag view from folder
          const sourceFolder = newNavigation.find((folder) => folder._id === sourceFolderId);
          updatedSourceNavList = sourceFolder && sourceFolder.children;
          sourceId = sourceViewId;
        } else {
          // drag folder
          updatedSourceNavList = newNavigation;
          sourceId = sourceFolderId;
        }
      } else if (sourceViewId) {
        // drag view outer of folders
        updatedSourceNavList = newNavigation;
        sourceId = sourceViewId;
      }

      // invalid drag source
      if (!Array.isArray(updatedSourceNavList) || updatedSourceNavList.length === 0 || !sourceId) {
        return;
      }
      const movedNavIndex = updatedSourceNavList.findIndex((nav) => nav._id === sourceId);
      if (movedNavIndex < 0) {
        return;
      }

      const movedNav = updatedSourceNavList[movedNavIndex];
      updatedSourceNavList.splice(movedNavIndex, 1);

      // insert folder/view into new position
      let updatedTargetNavList = newNavigation;
      if (targetFolderId && sourceViewId && !isAboveFolder) {
        // move view into folder
        let targetFolder = newNavigation.find((folder) => folder._id === targetFolderId);
        if (!Array.isArray(targetFolder.children)) {
          targetFolder.children = [];
        }
        updatedTargetNavList = targetFolder.children;
      }

      let targetNavIndex = -1;
      if (targetViewId) {
        // move folder/view above view
        targetNavIndex = updatedTargetNavList.findIndex((nav) => nav._id === targetViewId);
      } else if (targetFolderId) {
        // move view/folder above folder
        targetNavIndex = updatedTargetNavList.findIndex((nav) => nav._id === targetFolderId);
      }

      if (targetNavIndex > -1) {
        updatedTargetNavList.splice(targetNavIndex, 0, movedNav); // move above target folder/view
      } else {
        updatedTargetNavList.push(movedNav); // move into navigation or folder
      }

      setNavigation(newNavigation);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID, navigation]);

  const updateEnableFaceRecognition = useCallback((newValue) => {
    if (newValue === enableFaceRecognition) return;
    if (newValue) {
      toaster.success(gettext('Recognizing portraits. Please refresh the page later.'));
      addView({ name: '_people', type: VIEW_TYPE.FACE_RECOGNITION });
    } else {
      if (idViewMap[FACE_RECOGNITION_VIEW_ID]) {
        let isSelected = false;
        if (currentPath.includes('/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES + '/')) {
          const [, , currentViewId] = currentPath.split('/');
          isSelected = currentViewId === FACE_RECOGNITION_VIEW_ID;
        }
        const folders = navigation.filter((nav) => nav.type === VIEWS_TYPE_FOLDER);
        const targetFolder = folders.find((folder) => {
          const { children } = folder;
          if (Array.isArray(children) && children.length > 0) {
            const view = children.find((viewNav) => viewNav._id === FACE_RECOGNITION_VIEW_ID);
            if (view) {
              return true;
            }
          }
          return false;
        });
        const folderId = targetFolder ? targetFolder._id : null;
        deleteView({ folderId, viewId: FACE_RECOGNITION_VIEW_ID, isSelected });
      }
    }
    setEnableFaceRecognition(newValue);
  }, [enableFaceRecognition, currentPath, idViewMap, navigation, addView, deleteView]);

  const modifyViewType = useCallback((viewId, update) => {
    metadataAPI.modifyView(repoID, viewId, update).then(res => {
      setIdViewMap({
        ...idViewMap,
        [viewId]: {
          ...idViewMap[viewId],
          ...update,
        },
      });
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID, idViewMap]);

  useEffect(() => {
    if (isLoading) return;
    if (isBeingBuilt) {
      const firstView = getFirstView();
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
      const lastOpenedView = idViewMap[viewID] || '';
      if (lastOpenedView) {
        selectView(lastOpenedView);
        return;
      }
      const url = `${origin}${pathname}`;
      window.history.pushState({ url: url, path: '' }, '', url);
    }

    const firstView = getFirstView();
    if (firstView) {
      selectView(firstView);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isBeingBuilt]);

  useEffect(() => {
    if (!currentPath.includes('/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES + '/')) return;
    const [, , currentViewId] = currentPath.split('/');
    const currentView = idViewMap[currentViewId];
    if (currentView) {
      document.title = `${currentView.name} - Seafile`;
      updateFavicon(currentView.type);
      return;
    }
    document.title = originalTitleRef.current;
    updateFavicon('default');
  }, [currentPath, idViewMap]);

  return (
    <MetadataContext.Provider value={{
      isLoading,
      enableFaceRecognition,
      updateEnableFaceRecognition,
      isBeingBuilt,
      setIsBeingBuilt,
      navigation,
      collapsedFoldersIds: collapsedFoldersIds.current,
      idViewMap,
      collapseFolder,
      expandFolder,
      addFolder,
      modifyFolder,
      deleteFolder,
      selectView,
      addView,
      duplicateView,
      deleteView,
      updateView,
      moveView,
      modifyViewType,
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
