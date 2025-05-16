import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { baiduMapKey, gettext } from '../../utils/constants';
import Icon from '../../components/icon';
import ItemDropdownMenu from '../../components/dropdown-menu/metadata-item-dropdown-menu';
import toaster from '../../components/toast';
import InlineNameEditor from './inline-name-editor';
import { Utils, isMobile } from '../../utils/utils';
import { useMetadata } from '../hooks';
import { FACE_RECOGNITION_VIEW_ID, METADATA_VIEWS_DRAG_DATA_KEY, METADATA_VIEWS_KEY, VIEW_DEFAULT_SETTINGS, VIEW_INCOMPATIBLE_PROPERTIES, VIEW_PROPERTY_KEYS, VIEW_TYPE, VIEW_TYPE_ICON, VIEWS_TYPE_FOLDER, VIEWS_TYPE_VIEW } from '../constants';
import { validateName } from '../utils/validate';

const MOVE_TO_FOLDER_PREFIX = 'move_to_folder_';
const TURN_VIEW_INTO_PREFIX = 'turn_view_into_';

const VIEW_TYPE_LABEL = {
  [VIEW_TYPE.GALLERY]: gettext('Gallery'),
  [VIEW_TYPE.TABLE]: gettext('Table'),
  [VIEW_TYPE.KANBAN]: gettext('Kanban'),
  [VIEW_TYPE.MAP]: gettext('Map'),
};

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
  const { _id: viewId, name: viewName, type: viewType } = view;
  const [highlight, setHighlight] = useState(false);
  const [freeze, setFreeze] = useState(false);
  const [isSortShow, setSortShow] = useState(false);
  const [isRenaming, setRenaming] = useState(false);

  const { idViewMap, moveView, modifyViewType } = useMetadata();

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
    const convertableViews = Object.values(VIEW_TYPE).filter(type =>
      type !== viewType &&
      type !== VIEW_TYPE.FACE_RECOGNITION &&
      !(type === VIEW_TYPE.MAP && !baiduMapKey)
    );
    value.push({
      key: 'turn',
      value: gettext('Change view type'),
      subOpList: convertableViews.map((type) => {
        return {
          key: `${TURN_VIEW_INTO_PREFIX}${type}`,
          value: VIEW_TYPE_LABEL[type],
          icon_dom: <Icon symbol={VIEW_TYPE_ICON[type]} className="metadata-view-icon" />,
        };
      })
    });
    if (canDelete) {
      value.push({ key: 'delete', value: gettext('Delete') });
    }
    return value;
  }, [folderId, viewId, viewType, canUpdate, canDelete, getMoveableFolders]);

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

    if (operationKey.startsWith(TURN_VIEW_INTO_PREFIX)) {
      const targetType = operationKey.split(TURN_VIEW_INTO_PREFIX)[1];
      const update = { type: targetType };
      VIEW_INCOMPATIBLE_PROPERTIES.forEach(key => {
        if (key === VIEW_PROPERTY_KEYS.SETTINGS) {
          update[key] = VIEW_DEFAULT_SETTINGS[targetType];
          return;
        }
        update[key] = [];
      });
      modifyViewType(viewId, update);
      if (isSelected && window.sfMetadataStore) {
        window.sfMetadataStore.modifyViewType(viewId, update);
      }
      return;
    }
  }, [folderId, viewId, isSelected, onDelete, onCopy, moveView, modifyViewType]);

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

  const isValid = useCallback((event) => {
    return event.dataTransfer.types.includes(METADATA_VIEWS_DRAG_DATA_KEY);
  }, []);

  const onDragStart = useCallback((event) => {
    event.stopPropagation();
    if (!canDrop || freeze) return false;
    const dragData = JSON.stringify({
      type: METADATA_VIEWS_KEY,
      mode: VIEWS_TYPE_VIEW,
      view_id: viewId,
      folder_id: folderId,
    });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(METADATA_VIEWS_DRAG_DATA_KEY, dragData);
    setDragMode(VIEWS_TYPE_VIEW);
  }, [canDrop, viewId, folderId, setDragMode, freeze]);

  const onDragEnter = useCallback((event) => {
    const dragMode = getDragMode();
    if (!canDrop || folderId && dragMode === VIEWS_TYPE_FOLDER || freeze || !isValid(event)) {
      // not allowed drag folder into folder
      return false;
    }
    setSortShow(true);
  }, [canDrop, folderId, getDragMode, freeze, isValid]);

  const onDragLeave = useCallback(() => {
    if (!canDrop) return false;
    setSortShow(false);
  }, [canDrop]);

  const onDragMove = useCallback((event) => {
    if (!canDrop || freeze) return false;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, [canDrop, freeze]);

  const onDrop = useCallback((event) => {
    const dragMode = getDragMode();
    if (!canDrop || (folderId && dragMode === VIEWS_TYPE_FOLDER) || freeze) return false;
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
  }, [canDrop, folderId, viewId, getDragMode, moveView, freeze]);

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
    <div className={classnames('tree-node', { 'tree-node-sort': isSortShow })}>
      <div
        className={classnames('tree-node-inner text-nowrap', { 'tree-node-inner-hover': highlight, 'tree-node-hight-light': isSelected })}
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
