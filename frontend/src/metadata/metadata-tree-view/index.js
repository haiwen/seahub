import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import ViewsFolder from './folder';
import ViewItem from './view';
import NewFolder from './new-folder';
import NewView from './new-view';
import { gettext } from '../../utils/constants';
import { useMetadata } from '../hooks';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { EVENT_BUS_TYPE, TREE_NODE_LEFT_INDENT, VIEWS_TYPE_FOLDER } from '../constants';
import EventBus from '../../components/common/event-bus';

import './index.css';

const MetadataTreeView = ({ userPerm, currentPath }) => {
  const {
    navigation,
    idViewMap,
    selectView,
    addView,
    duplicateView,
    deleteView,
    updateView,
  } = useMetadata();
  const [showInput, setShowInput] = useState(false);
  const [newView, setNewView] = useState(null);

  const eventBus = EventBus.getInstance();

  const dragMode = useRef(null);

  const setDragMode = useCallback((currDragMode) => {
    dragMode.current = currDragMode;
  }, []);

  const getDragMode = useCallback(() => {
    return dragMode.current;
  }, []);

  const canDeleteView = useMemo(() => {
    return Object.keys(idViewMap).length > 1;
  }, [idViewMap]);

  const getFolders = useCallback(() => {
    return navigation.filter((nav) => nav.type === VIEWS_TYPE_FOLDER);
  }, [navigation]);

  const getFoldersNames = useCallback(() => {
    return getFolders().map((folder) => folder.name);
  }, [getFolders]);

  const prepareAddFolder = () => {
    setNewView(null);
    setShowInput(true);
  };

  const generateNewViewDefaultName = useCallback(() => {
    let newViewName = gettext('Untitled');
    const otherViewsName = Object.values(idViewMap).map(v => v.name);
    let i = 1;
    while (otherViewsName.includes(newViewName)) {
      newViewName = gettext('Untitled') + ' (' + (i++) + ')';
    }
    return newViewName;
  }, [idViewMap]);

  const prepareAddView = useCallback(({ viewType }) => {
    setNewView({ key: viewType, type: viewType, default_name: generateNewViewDefaultName() });
    setShowInput(true);
  }, [generateNewViewDefaultName]);

  const closeNewView = useCallback(() => {
    setShowInput(false);
  }, []);

  const closeNewFolder = useCallback(() => {
    setShowInput(false);
  }, []);

  const modifyView = useCallback((viewId, update, successCallback, failCallback) => {
    updateView(viewId, update, () => {
      successCallback && successCallback();
    }, failCallback);
  }, [updateView]);

  const getMoveableFolders = useCallback((currentFolderId) => {
    const folders = getFolders();
    return folders.filter((folder) => folder._id !== currentFolderId);
  }, [getFolders]);

  const handleAddView = useCallback((name, type) => {
    addView({ name, type });
  }, [addView]);

  const handleDuplicateView = useCallback((viewId) => {
    duplicateView({ viewId });
  }, [duplicateView]);

  const handleDeleteView = useCallback((viewId, isSelected) => {
    deleteView({ viewId, isSelected });
  }, [deleteView]);

  useEffect(() => {
    const unsubscribeAddFolder = eventBus.subscribe(EVENT_BUS_TYPE.ADD_FOLDER, prepareAddFolder);
    const unsubscribeAddView = eventBus.subscribe(EVENT_BUS_TYPE.ADD_VIEW, prepareAddView);
    return () => {
      unsubscribeAddFolder();
      unsubscribeAddView();
    };
  }, [prepareAddView, eventBus]);

  const renderFolder = (folder) => {
    return (
      <ViewsFolder
        key={`metadata-views-folder-${folder._id}`}
        leftIndent={TREE_NODE_LEFT_INDENT * 2}
        folder={folder}
        currentPath={currentPath}
        userPerm={userPerm}
        canDeleteView={canDeleteView}
        getFoldersNames={getFoldersNames}
        getMoveableFolders={getMoveableFolders}
        generateNewViewDefaultName={generateNewViewDefaultName}
        setDragMode={setDragMode}
        getDragMode={getDragMode}
        selectView={selectView}
        modifyView={modifyView}
      />
    );
  };

  const renderView = (view) => {
    const viewPath = '/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES + '/' + view._id;
    const isSelected = currentPath.includes(viewPath);
    return (
      <ViewItem
        key={`metadata-views-folder-${view._id}`}
        leftIndent={TREE_NODE_LEFT_INDENT * 2}
        canDelete={canDeleteView}
        isSelected={isSelected}
        userPerm={userPerm}
        view={view}
        getMoveableFolders={getMoveableFolders}
        setDragMode={setDragMode}
        getDragMode={getDragMode}
        onClick={selectView}
        onDelete={handleDeleteView}
        onCopy={handleDuplicateView}
        onUpdate={modifyView}
      />
    );
  };

  return (
    <div className="tree-view tree metadata-tree-view">
      <div className="tree-node">
        <div className="children">
          {Array.isArray(navigation) && navigation.length > 0 && navigation.map((item, index) => {
            if (item.type === VIEWS_TYPE_FOLDER) {
              return renderFolder(item, index);
            }
            const view = idViewMap[item._id];
            return renderView(view, index);
          })}
          {showInput && (newView ?
            <NewView newView={newView} leftIndent={TREE_NODE_LEFT_INDENT * 2} closeNewView={closeNewView} addView={handleAddView} /> :
            <NewFolder closeNewFolder={closeNewFolder} />
          )}
        </div>
      </div>
    </div>
  );
};

MetadataTreeView.propTypes = {
  userPerm: PropTypes.string,
  currentPath: PropTypes.string,
};

export default MetadataTreeView;
