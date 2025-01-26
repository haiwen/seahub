import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { gettext } from '../../utils/constants';
import Icon from '../../components/icon';
import ItemDropdownMenu from '../../components/dropdown-menu/item-dropdown-menu';
import toaster from '../../components/toast';
import InlineNameEditor from './inline-name-editor';
import { Utils, isMobile } from '../../utils/utils';
import { useMetadata } from '../hooks';
import { FACE_RECOGNITION_VIEW_ID, METADATA_VIEWS_DRAG_DATA_KEY, METADATA_VIEWS_KEY, VIEW_TYPE_ICON, VIEWS_TYPE_FOLDER, VIEWS_TYPE_VIEW } from '../constants';
import { validateName } from '../utils/validate';

const MOVE_TO_FOLDER_PREFIX = 'move_to_folder_';

const ViewItem = ({
  leftIndent,
  canDelete,
  userPerm,
  isSelected,
  folderId,
  view,
  getMoveableFolders,
  setDragMode,
  getDragMode,
  onClick,
  onDelete,
  onCopy,
  onUpdate,
}) => {
  const { _id: viewId, name: viewName } = view;
  const [highlight, setHighlight] = useState(false);
  const [freeze, setFreeze] = useState(false);
  const [isSortShow, setSortShow] = useState(false);
  const [isRenaming, setRenaming] = useState(false);

  const { idViewMap, moveView } = useMetadata();

  const otherViewsName = Object.values(idViewMap).filter(v => v._id !== view._id).map(v => v.name);

  const canUpdate = useMemo(() => {
    if (userPerm !== 'rw' && userPerm !== 'admin') return false;
    return true;
  }, [userPerm]);

  const canDrop = useMemo(() => {
    if (Utils.isIEBrowser() || !canUpdate) return false;
    return true;
  }, [canUpdate]);

  const operations = useMemo(() => {
    if (!canUpdate) return [];
    if (viewId === FACE_RECOGNITION_VIEW_ID) {
      return [];
    }
    let value = [
      { key: 'rename', value: gettext('Rename') },
      { key: 'duplicate', value: gettext('Duplicate') }
    ];

    const moveableFolders = getMoveableFolders(folderId);
    if (moveableFolders.length > 0) {
      value.push({
        key: 'move',
        value: gettext('Move'),
        subOpList: moveableFolders.map((folder) => ({ key: `${MOVE_TO_FOLDER_PREFIX}${folder._id}`, value: folder.name, icon_dom: <i className="sf3-font sf3-font-folder"></i> })),
      });
    }
    if (canDelete) {
      value.push({ key: 'delete', value: gettext('Delete') });
    }
    return value;
  }, [folderId, viewId, canUpdate, canDelete, getMoveableFolders]);

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

  const operationClick = useCallback((operationKey) => {
    if (operationKey.startsWith(MOVE_TO_FOLDER_PREFIX)) {
      const targetFolderId = operationKey.split(MOVE_TO_FOLDER_PREFIX)[1];
      moveView({ sourceViewId: viewId, sourceFolderId: folderId, targetFolderId });
      return;
    }
    if (operationKey === 'rename') {
      setRenaming(true);
      return;
    }

    if (operationKey === 'duplicate') {
      onCopy(viewId);
      return;
    }

    if (operationKey === 'delete') {
      onDelete(viewId, isSelected);
      return;
    }
  }, [folderId, viewId, isSelected, onDelete, onCopy, moveView]);

  const renameView = useCallback((name, failCallback) => {
    onUpdate(viewId, { name }, () => {
      setRenaming(false);
      if (!isSelected) return;
      document.title = `${name} - Seafile`;
    }, (error) => {
      failCallback(error);
      if (!isSelected) return;
      document.title = `${viewName} - Seafile`;
    });
  }, [isSelected, onUpdate, viewId, viewName]);

  const onDragStart = useCallback((event) => {
    if (!canDrop) return false;
    const dragData = JSON.stringify({
      type: METADATA_VIEWS_KEY,
      mode: VIEWS_TYPE_VIEW,
      view_id: viewId,
      folder_id: folderId,
    });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(METADATA_VIEWS_DRAG_DATA_KEY, dragData);
    setDragMode(VIEWS_TYPE_VIEW);
  }, [canDrop, viewId, folderId, setDragMode]);

  const onDragEnter = useCallback((event) => {
    const dragMode = getDragMode();
    if (!canDrop || folderId && dragMode === VIEWS_TYPE_FOLDER) {
      // not allowed drag folder into folder
      return false;
    }
    setSortShow(true);
  }, [canDrop, folderId, getDragMode]);

  const onDragLeave = useCallback(() => {
    if (!canDrop) return false;
    setSortShow(false);
  }, [canDrop]);

  const onDragMove = useCallback((event) => {
    if (!canDrop) return false;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, [canDrop]);

  const onDrop = useCallback((event) => {
    const dragMode = getDragMode();
    if (!canDrop || (folderId && dragMode === VIEWS_TYPE_FOLDER)) return false;
    event.stopPropagation();
    setSortShow(false);

    let dragData = event.dataTransfer.getData(METADATA_VIEWS_DRAG_DATA_KEY);
    if (!dragData) return;
    dragData = JSON.parse(dragData);
    const { view_id: sourceViewId, folder_id: sourceFolderId } = dragData;
    if ((dragMode === VIEWS_TYPE_VIEW && !sourceViewId) || (dragMode === VIEWS_TYPE_FOLDER && !sourceFolderId)) {
      return;
    }
    moveView({ sourceViewId, sourceFolderId, targetViewId: viewId, targetFolderId: folderId });
  }, [canDrop, folderId, viewId, getDragMode, moveView]);

  const handleSubmit = useCallback((name) => {
    const { isValid, message } = validateName(name, otherViewsName);
    if (!isValid) {
      toaster.danger(message);
      return;
    }
    if (message === viewName) {
      setRenaming(false);
      return;
    }
    renameView(message);
  }, [viewName, otherViewsName, renameView]);

  return (
    <div className="tree-node">
      <div
        className={classnames('tree-node-inner text-nowrap', { 'tree-node-inner-hover': highlight, 'tree-node-hight-light': isSelected, 'tree-node-sort': isSortShow })}
        title={viewName}
        onMouseEnter={onMouseEnter}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        onClick={() => onClick(view, isSelected)}
      >
        <div
          className="tree-node-text"
          draggable={canUpdate}
          onDragStart={onDragStart}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragMove}
          onDrop={onDrop}
          style={{ paddingLeft: leftIndent + 5 }}
        >
          {isRenaming ? (
            <InlineNameEditor
              name={viewName}
              className="rename mt-0"
              onSubmit={handleSubmit}
            />
          ) : viewName}
        </div>
        <div className="left-icon" style={{ left: leftIndent - 40 }}>
          <div className="tree-node-icon">
            <Icon symbol={VIEW_TYPE_ICON[view.type] || 'table'} className="metadata-views-icon" />
          </div>
        </div>
        {operations.length > 0 && (
          <div className="right-icon" id={`metadata-view-dropdown-item-${viewId}`} >
            {highlight && (
              <ItemDropdownMenu
                item={{ name: 'metadata-view' }}
                menuClassname="metadata-views-dropdown-menu"
                toggleClass="sf3-font sf3-font-more"
                freezeItem={freezeItem}
                unfreezeItem={unfreezeItem}
                getMenuList={() => operations}
                onMenuItemClick={operationClick}
                menuStyle={isMobile ? { zIndex: 1050 } : {}}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

ViewItem.propTypes = {
  leftIndent: PropTypes.number,
  canDelete: PropTypes.bool,
  isSelected: PropTypes.bool,
  folderId: PropTypes.string,
  view: PropTypes.object,
  getMoveableFolders: PropTypes.func,
  setDragMode: PropTypes.func,
  getDragMode: PropTypes.func,
  onClick: PropTypes.func,
};

export default ViewItem;
