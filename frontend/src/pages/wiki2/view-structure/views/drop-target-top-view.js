import React from 'react';
import { DropTarget } from 'react-dnd';
import PropTypes from 'prop-types';

const DropTargetTopView = (Placeholder) => class extends React.Component {

  static propTypes = {
    connectDropTarget: PropTypes.func.isRequired,
    isOver: PropTypes.bool,
    canDrop: PropTypes.bool,
    draggedRow: PropTypes.object,
    targetFolderId: PropTypes.string,
    targetViewId: PropTypes.string,
    onMoveView: PropTypes.func,
  };

  render() {
    const { connectDropTarget, isOver, canDrop, draggedRow } = this.props;
    const { mode } = draggedRow || {};
    if (mode !== 'view') {
      return null;
    }
    const style = {
      position: 'absolute',
      top: 0,
      width: '100%',
      zIndex: canDrop ? 1 : -1,
    };
    return connectDropTarget(
      <div style={style}>
        <Placeholder />
        {isOver && canDrop && <div className="view-drop-target" />}
      </div>
    );
  }
};

const target = {
  drop(props, monitor) {
    const sourceRow = monitor.getItem();
    if (sourceRow.mode !== 'view') {
      return;
    }
    const { targetFolderId, targetViewId } = props;
    const sourceFolderId = sourceRow.folderId;
    const draggedViewId = sourceRow.data.id;
    if (draggedViewId !== targetViewId) {
      props.onMoveView({
        moved_view_id: draggedViewId,
        target_view_id: targetViewId,
        source_view_folder_id: sourceFolderId,
        target_view_folder_id: targetFolderId,
        move_position: 'move_above'
      });
    }
  }
};

function collect(connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
    draggedRow: monitor.getItem(),
  };
}

class Placeholder extends React.Component {

  static propTypes = {
    key: PropTypes.string,
  };

  render() {
    return (
      <div key={this.props.key} style={{ height: 40, width: '100%' }}/>
    );
  }
}

export default DropTarget('ViewStructure', target, collect)(DropTargetTopView(Placeholder));
