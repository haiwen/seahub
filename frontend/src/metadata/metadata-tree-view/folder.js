import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ViewItem from './view';
import ItemDropdownMenu from '../../components/dropdown-menu/metadata-item-dropdown-menu';
import toaster from '../../components/toast';
import NewView from './new-view';
import InlineNameEditor from './inline-name-editor';
import { useMetadata } from '../hooks';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { Utils, isMobile } from '../../utils/utils';
import TextTranslation from '../../utils/text-translation';
import { validateName } from '../utils/validate';
import { METADATA_VIEWS_DRAG_DATA_KEY, METADATA_VIEWS_KEY, TREE_NODE_LEFT_INDENT, VIEW_TYPE, VIEWS_TYPE_FOLDER, VIEWS_TYPE_VIEW } from '../constants';
import { getNewViewMenuItem, KEY_ADD_VIEW_MAP } from '../../components/dir-view-mode/dir-views/new-view-menu';
import Icon from '../../components/icon';

const ViewsFolder = ({
  leftIndent, folder, currentPath, userPerm, canDeleteView, getFoldersNames, getMoveableFolders, generateNewViewDefaultName,
  setDragMode, getDragMode, selectView, modifyView,
}) => {
  const {
    idViewMap, collapsedFoldersIds, collapseFolder, expandFolder, modifyFolder, deleteFolder,
    deleteView, duplicateView, addView, moveView,
  } = useMetadata();
  const { _id: folderId, name: folderName, children } = folder || {};
  const [expanded, setExpanded] = useState(!collapsedFoldersIds.includes(folderId));
  const [highlight, setHighlight] = useState(false);
  const [freeze, setFreeze] = useState(false);
  const [isRenaming, setRenaming] = useState(false);
  const [newView, setNewView] = useState(null);
  const [isDropShow, setDropShow] = useState(false);
  const [isSortShow, setSortShow] = useState(false);

  const canUpdate = useMemo(() => {
    if (userPerm !== 'rw' && userPerm !== 'admin') return false;
    return true;
  }, [userPerm]);

  const canDrop = useMemo(() => {
    if (Utils.isIEBrowser() || !canUpdate) return false;
    return true;
  }, [canUpdate]);

  const isValid = useCallback((event) => {
    return event.dataTransfer.types.includes(METADATA_VIEWS_DRAG_DATA_KEY);
  }, []);

  const folderMoreOperationMenus = useMemo(() => {
    let menus = [];
    if (canUpdate) {
      menus.push(
        getNewViewMenuItem(),
        TextTranslation.RENAME,
        TextTranslation.DELETE,
      );
    }
    return menus;
  }, [canUpdate]);

  const onMouseEnter = useCallback(() => {
    if (freeze) return;
    setHighlight(true);
  }, [freeze]);

  const onMouseOver = useCallback(() => {
    if (freeze) return;
    setHighlight(true);
  }, [freeze]);

  const onMouseLeave = useCallback(() => {
    if (freeze) return;
    setHighlight(false);
  }, [freeze]);

  const freezeItem = useCallback(() => {
    setFreeze(true);
    setHighlight(true);
  }, []);

  const unfreezeItem = useCallback(() => {
    setFreeze(false);
    setHighlight(false);
  }, []);

  const clickFolder = useCallback(() => {
    if (expanded) {
      collapseFolder(folderId);
    } else {
      expandFolder(folderId);
    }
    setExpanded(!expanded);
  }, [expanded, folderId, collapseFolder, expandFolder]);

  const prepareAddView = useCallback((viewType) => {
    setNewView({ key: viewType, type: viewType, default_name: generateNewViewDefaultName() });
  }, [generateNewViewDefaultName]);

  const clickMenu = useCallback((operationKey) => {
    switch (operationKey) {
      case KEY_ADD_VIEW_MAP.ADD_TABLE: {
        prepareAddView(VIEW_TYPE.TABLE);
        return;
      }
      case KEY_ADD_VIEW_MAP.ADD_GALLERY: {
        prepareAddView(VIEW_TYPE.GALLERY);
        return;
      }
      case KEY_ADD_VIEW_MAP.ADD_KANBAN: {
        prepareAddView(VIEW_TYPE.KANBAN);
        return;
      }
      case KEY_ADD_VIEW_MAP.ADD_MAP: {
        prepareAddView(VIEW_TYPE.MAP);
        return;
      }
      case KEY_ADD_VIEW_MAP.ADD_CARD: {
        prepareAddView(VIEW_TYPE.CARD);
        return;
      }
      case KEY_ADD_VIEW_MAP.ADD_STATISTICS: {
        prepareAddView(VIEW_TYPE.STATISTICS);
        return;
      }
      case TextTranslation.RENAME.key: {
        setRenaming(true);
        return;
      }
      case TextTranslation.DELETE.key: {
        deleteFolder(folderId);
        return;
      }
      default: {
        return;
      }
    }
  }, [prepareAddView, folderId, deleteFolder]);

  const onDragStart = useCallback((event) => {
    event.stopPropagation();
    if (!canDrop) return false;
    const dragData = JSON.stringify({ type: METADATA_VIEWS_KEY, folder_id: folderId, mode: VIEWS_TYPE_FOLDER });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(METADATA_VIEWS_DRAG_DATA_KEY, dragData);
    setDragMode(VIEWS_TYPE_FOLDER);
  }, [canDrop, folderId, setDragMode]);

  const onDragEnter = useCallback((event) => {
    if (!canDrop || !isValid(event)) return false;

    const dragMode = getDragMode();
    if (!canDrop || folderId && dragMode === VIEWS_TYPE_FOLDER) {
      // not allowed drag folder into folder
      setSortShow(true);
      return false;
    }

    const targetRect = event.target.getBoundingClientRect();
    const pointerPosition = event.clientY - targetRect.top;
    if (pointerPosition <= 4) {
      setSortShow(true);
    } else {
      setDropShow(true);
    }
  }, [canDrop, folderId, getDragMode, isValid]);

  const onDragLeave = useCallback(() => {
    if (!canDrop) return false;
    setDropShow(false);
    setSortShow(false);
  }, [canDrop]);

  const onDragMove = useCallback((event) => {
    if (!canDrop || !isValid(event)) return false;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const targetRect = event.target.getBoundingClientRect();
    const pointerPosition = event.clientY - targetRect.top;
    if (pointerPosition <= 4) {
      setSortShow(true);
      setDropShow(false);
    } else {
      setDropShow(true);
      setSortShow(false);
    }
  }, [canDrop, isValid]);

  const onDrop = useCallback((event) => {
    if (!canDrop) return false;
    event.stopPropagation();
    setDropShow(false);
    setSortShow(false);

    let dragData = event.dataTransfer.getData(METADATA_VIEWS_DRAG_DATA_KEY);
    if (!dragData) return;
    dragData = JSON.parse(dragData);
    if (dragData.type !== METADATA_VIEWS_KEY) return false;
    const dragMode = getDragMode();
    const { view_id: sourceViewId, folder_id: sourceFolderId } = dragData;
    if ((dragMode === VIEWS_TYPE_VIEW && !sourceViewId)) {
      return;
    }
    moveView({ sourceViewId, sourceFolderId, targetFolderId: folderId, isAboveFolder: isSortShow });
  }, [canDrop, folderId, getDragMode, moveView, isSortShow]);

  const onConfirmRename = useCallback((name) => {
    const foldersNames = getFoldersNames();
    const otherFoldersNames = foldersNames.filter((currFolderName) => currFolderName !== folderName);
    const { isValid, message } = validateName(name, otherFoldersNames);
    if (!isValid) {
      toaster.danger(message);
      return;
    }
    if (message === folderName) {
      setRenaming(false);
      return;
    }
    modifyFolder(folderId, { name: message });
    setRenaming(false);
  }, [folderId, folderName, getFoldersNames, modifyFolder]);

  const addViewIntoFolder = useCallback((viewName, viewType) => {
    addView({ folderId, name: viewName, type: viewType, successCallback: () => setNewView(null) });
  }, [folderId, addView]);

  const deleteViewFromFolder = useCallback((viewId, isSelected) => {
    deleteView({ folderId, viewId, isSelected });
  }, [folderId, deleteView]);

  const duplicateViewFromFolder = useCallback((viewId) => {
    duplicateView({ folderId, viewId });
  }, [folderId, duplicateView]);

  const renderViews = () => {
    if (!Array.isArray(children) || children.length === 0) {
      return null;
    }
    return children.map((children) => {
      const { _id: viewId, type: childType } = children || {};
      if (!viewId || childType !== VIEWS_TYPE_VIEW) {
        return null;
      }

      const view = idViewMap[viewId];
      if (!view) return null;

      const viewPath = '/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES + '/' + viewId;
      const isSelected = currentPath === viewPath;
      return (
        <ViewItem
          key={viewId}
          folderId={folderId}
          leftIndent={leftIndent + TREE_NODE_LEFT_INDENT}
          canDelete={canDeleteView}
          isSelected={isSelected}
          userPerm={userPerm}
          view={view}
          getMoveableFolders={getMoveableFolders}
          setDragMode={setDragMode}
          getDragMode={getDragMode}
          onClick={selectView}
          onDelete={deleteViewFromFolder}
          onCopy={duplicateViewFromFolder}
          onUpdate={modifyView}
        />
      );
    });
  };

  return (
    <div className="tree-node views-folder-wrapper">
      <div
        className={classnames('tree-node-inner views-folder-main text-nowrap', {
          'tree-node-inner-hover': highlight,
          'tree-node-drop': isDropShow,
          'tree-node-sort': isSortShow
        })}
        type="dir"
        title={folderName}
        onMouseEnter={onMouseEnter}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        onFocus={onMouseEnter}
        onClick={clickFolder}
        onKeyDown={Utils.onKeyDown}
        tabIndex="0"
      >
        <div
          className="tree-node-text views-folder-name"
          style={{ paddingLeft: leftIndent + 5 }}
          draggable={!isRenaming && canUpdate}
          onDragStart={onDragStart}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragMove}
          onDrop={onDrop}
        >
          {isRenaming ? (
            <InlineNameEditor
              name={folderName}
              className="rename mt-0"
              onSubmit={onConfirmRename}
            />
          ) : folderName}
        </div>
        <div className="left-icon" style={{ left: leftIndent - 40 }}>
          <span className="folder-toggle-icon">
            <Icon symbol="down" className={classnames({ 'rotate-270': !expanded })} />
          </span>
          <span className="tree-node-icon">
            <Icon symbol="folder" />
          </span>
        </div>
        <div className="right-icon">
          {(highlight && folderMoreOperationMenus.length > 0) && (
            <ItemDropdownMenu
              item={{ name: 'metadata-folder' }}
              menuClassname="metadata-views-dropdown-menu"
              toggleChildren={<Icon symbol="more-level" />}
              freezeItem={freezeItem}
              unfreezeItem={unfreezeItem}
              getMenuList={() => folderMoreOperationMenus}
              onMenuItemClick={clickMenu}
              menuStyle={isMobile ? { zIndex: 1050 } : {}}
            />
          )}
        </div>
      </div>
      <div className="children views-folder-children">
        {expanded && renderViews()}
        {newView && <NewView newView={newView} leftIndent={TREE_NODE_LEFT_INDENT * 3} addView={addViewIntoFolder} />}
      </div>
    </div>
  );
};

ViewsFolder.propTypes = {
  leftIndent: PropTypes.number,
  folder: PropTypes.object,
  currentPath: PropTypes.string,
  userPerm: PropTypes.string,
  canDeleteView: PropTypes.bool,
  getFoldersNames: PropTypes.func,
  getMoveableFolders: PropTypes.func,
  generateNewViewDefaultName: PropTypes.func,
  setDragMode: PropTypes.func,
  getDragMode: PropTypes.func,
  selectView: PropTypes.func,
  modifyView: PropTypes.func,
};

export default ViewsFolder;
