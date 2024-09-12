import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { DragSource, DropTarget } from 'react-dnd';
import { gettext } from '../../../utils/constants';
import Icon from '../../../components/icon';
import ItemDropdownMenu from '../../../components/dropdown-menu/item-dropdown-menu';
import { Rename } from '../../metadata-view/components/popover/view-popover';
import { Utils, isMobile } from '../../../utils/utils';
import { VIEW_TYPE_ICON } from '../../metadata-view/_basic';

import './index.css';
import { useMetadata } from '../../hooks';

const viewItemSource = {
  beginDrag(props) {
    return {
      id: props.view._id,
      index: props.index,
      view: props.view
    };
  },
  endDrag(props, monitor) {
    const source = monitor.getItem();
    const didDrop = monitor.didDrop();
    let target = {};
    if (!didDrop) {
      return { source, target };
    }
  },
  isDragging(props) {
    const { view, dragged } = props;
    const { id } = dragged;
    return id === view._id;
  }
};

const viewItemTarget = {
  canDrop(props, monitor) {
    return props.userPerm === 'rw' || props.userPerm === 'admin';
  },
  hover(props, monitor, component) {
    if (!component) {
      return null;
    }
    const dragItem = monitor.getItem();
    const hoverId = props.view._id;

    if (dragItem.id === hoverId) {
      return;
    }
  },
  drop(props, monitor) {
    const draggedItem = monitor.getItem();
    const targetItem = props.view;

    if (draggedItem.id !== targetItem._id) {
      props.onMove(draggedItem.id, targetItem._id);
    }
  }
};

const ViewItem = ({
  canDelete,
  userPerm,
  isSelected,
  view,
  onClick,
  onDelete,
  onCopy,
  onUpdate,
  isDragging,
  connectDragSource,
  connectDropTarget,
  connectDragPreview,
}) => {
  const [highlight, setHighlight] = useState(false);
  const [freeze, setFreeze] = useState(false);
  const [isShowRenamePopover, setRenamePopoverShow] = useState(false);
  const { viewsMap } = useMetadata();

  const otherViewsName = Object.values(viewsMap).filter(v => v._id !== view._id).map(v => v.name);

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

  const closeRenamePopover = useCallback(() => {
    setRenamePopoverShow(false);
  }, []);

  const renameView = useCallback((name, failCallback) => {
    onUpdate({ name }, () => {
      setRenamePopoverShow(false);
    }, failCallback);
  }, [onUpdate]);

  const itemContent = (
    <div
      className={classnames('tree-node-inner text-nowrap', { 'tree-node-inner-hover': highlight, 'tree-node-hight-light': isSelected, 'tree-node-drop': isDragging })}
      title={gettext('File extended properties')}
      onMouseEnter={onMouseEnter}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
      onClick={() => onClick(view)}
      style={{ opacity: isDragging ? 0.5 : 1, cursor: canDrop ? 'pointer' : 'default' }}
    >
      <div
        className="tree-node-text"
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

      {isShowRenamePopover && (
        <Rename value={view.name} otherViewsName={otherViewsName} target={`metadata-view-dropdown-item-${view._id}`} toggle={closeRenamePopover} onSubmit={renameView} />
      )}
    </div>
  );

  return connectDropTarget(connectDragPreview(connectDragSource(itemContent)));
};

ViewItem.propTypes = {
  canDelete: PropTypes.bool,
  userPerm: PropTypes.string,
  isSelected: PropTypes.bool,
  view: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onMove: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  connectDragPreview: PropTypes.func.isRequired,
};

export default DropTarget(
  'sfMetadataTreeViewItem',
  viewItemTarget,
  (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    canDrop: monitor.canDrop(),
    dragged: monitor.getItem(),
  })
)(
  DragSource(
    'sfMetadataTreeViewItem',
    viewItemSource,
    (connect, monitor) => ({
      connectDragSource: connect.dragSource(),
      connectDragPreview: connect.dragPreview(),
      isDragging: monitor.isDragging()
    })
  )(ViewItem)
);
