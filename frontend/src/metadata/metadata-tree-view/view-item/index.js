import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { gettext } from '../../../utils/constants';
import Icon from '../../../components/icon';
import ItemDropdownMenu from '../../../components/dropdown-menu/item-dropdown-menu';
import { Rename } from '../../metadata-view/components/popover/view-popover';
import { Utils, isMobile } from '../../../utils/utils';
import { VIEW_TYPE_ICON } from '../../metadata-view/_basic';

import './index.css';

const ViewItem = ({
  canDelete,
  userPerm,
  isSelected,
  view,
  onClick,
  onDelete,
  onCopy,
  onUpdate,
  onMove,
}) => {
  const [highlight, setHighlight] = useState(false);
  const [freeze, setFreeze] = useState(false);
  const [isDropShow, setDropShow] = useState(false);
  const [isShowRenamePopover, setRenamePopoverShow] = useState(false);

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
    let value = [
      { key: 'rename', value: gettext('Rename') },
      { key: 'duplicate', value: gettext('Duplicate') }
    ];
    if (canDelete) {
      value.push({ key: 'delete', value: gettext('Delete') });
    }
    return value;
  }, [canUpdate, canDelete]);

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
  }, []);

  const unfreezeItem = useCallback(() => {
    setFreeze(false);
    setHighlight(false);
  }, []);

  const operationClick = useCallback((operationKey) => {
    if (operationKey === 'rename') {
      setRenamePopoverShow(true);
      return;
    }

    if (operationKey === 'duplicate') {
      onCopy();
      return;
    }

    if (operationKey === 'delete') {
      onDelete();
      return;
    }
  }, [onDelete, onCopy]);

  const closeRenamePopover = useCallback((event) => {
    event.stopPropagation();
    setRenamePopoverShow(false);
  }, []);

  const renameView = useCallback((name, failCallback) => {
    onUpdate({ name }, () => {
      setRenamePopoverShow(false);
    }, failCallback);
  }, [onUpdate]);

  const onDragStart = useCallback((event) => {
    if (!canDrop) return false;
    const dragData = JSON.stringify({ type: 'sf-metadata-view', view_id: view._id });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/drag-sf-metadata-view', dragData);
  }, [canDrop, view]);

  const onDragEnter = useCallback((event) => {
    if (!canDrop) return false;
    setDropShow(true);
  }, [canDrop]);

  const onDragLeave = useCallback(() => {
    if (!canDrop) return false;
    setDropShow(false);
  }, [canDrop]);

  const onDragMove = useCallback((event) => {
    if (!canDrop) return false;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, [canDrop]);

  const onDrop = useCallback((event) => {
    if (!canDrop) return false;
    event.stopPropagation();
    setDropShow(false);

    let dragData = event.dataTransfer.getData('application/drag-sf-metadata-view');
    if (!dragData) return;
    dragData = JSON.parse(dragData);
    if (dragData.type !== 'sf-metadata-view') return false;
    if (!dragData.view_id) return;
    onMove && onMove(dragData.view_id, view._id);
  }, [canDrop, view, onMove]);

  return (
    <>
      <div
        className={classnames('tree-node-inner text-nowrap', { 'tree-node-inner-hover': highlight, 'tree-node-hight-light': isSelected, 'tree-node-drop': isDropShow })}
        title={gettext('File extended properties')}
        onMouseEnter={onMouseEnter}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        onClick={() => onClick(view)}
      >
        <div
          className="tree-node-text"
          draggable={canUpdate}
          onDragStart={onDragStart}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragMove}
          onDrop={onDrop}
        >
          {view.name}
        </div>
        <div className="left-icon">
          <div className="tree-node-icon">
            <Icon symbol={VIEW_TYPE_ICON[view.type] || 'table'} className="metadata-views-icon" />
          </div>
        </div>
        <div className="right-icon" id={`metadata-view-dropdown-item-${view._id}`} >
          {highlight && (
            <ItemDropdownMenu
              item={{ name: 'metadata-view' }}
              toggleClass="sf3-font sf3-font-more"
              freezeItem={freezeItem}
              unfreezeItem={unfreezeItem}
              getMenuList={() => operations}
              onMenuItemClick={operationClick}
              menuStyle={isMobile ? { zIndex: 1050 } : {}}
            />
          )}
        </div>
      </div>
      {isShowRenamePopover && (
        <Rename value={view.name} target={`metadata-view-dropdown-item-${view._id}`} toggle={closeRenamePopover} onSubmit={renameView} />
      )}
    </>
  );
};

ViewItem.propTypes = {
  canDelete: PropTypes.bool,
  isSelected: PropTypes.bool,
  view: PropTypes.object,
  onClick: PropTypes.func,
};

export default ViewItem;
