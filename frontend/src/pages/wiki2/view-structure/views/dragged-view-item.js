import { DragSource, DropTarget } from 'react-dnd';
import { DRAGGED_FOLDER_MODE, DRAGGED_PAGE_MODE } from '../constant';
import ViewItem from './view-item';

const dragSource = {
  beginDrag: props => {
    return {
      idx: props.viewIndex,
      data: { ...props.view, index: props.viewIndex },
      folderId: props.folderId,
      mode: DRAGGED_PAGE_MODE,
    };
  },
  endDrag(props, monitor) {
    const viewSource = monitor.getItem();
    const didDrop = monitor.didDrop();
    let viewTarget = {};
    if (!didDrop) {
      return { viewSource, viewTarget };
    }
  },
  isDragging(props) {
    const { draggedPage, viewIndex: targetIndex } = props;
    const { idx } = draggedPage;
    return idx > targetIndex;
  }
};

const dropTarget = {
  drop(props, monitor) {
    const sourceRow = monitor.getItem();
    // 1 drag page
    if (sourceRow.mode === DRAGGED_PAGE_MODE) {
      const { infolder, viewIndex: targetIndex, view: targetView, folderId: targetFolderId } = props;
      const sourceFolderId = sourceRow.folderId;
      const draggedViewId = sourceRow.data.id;
      const targetViewId = targetView.id;

      if (draggedViewId !== targetViewId) {
        const sourceIndex = sourceRow.idx;
        let move_position;
        if (infolder) {
          move_position = 'move_below';
        } else {
          move_position = sourceIndex > targetIndex ? 'move_above' : 'move_below';
        }

        props.onMoveView({
          moved_view_id: draggedViewId,
          target_view_id: targetViewId,
          source_view_folder_id: sourceFolderId,
          target_view_folder_id: targetFolderId,
          move_position,
        });
      }
      return;
    }
    // 1 drag folder
    if (sourceRow.mode === DRAGGED_FOLDER_MODE) {
      const { viewIndex: targetIndex, view: targetView } = props;
      const draggedFolderId = sourceRow.data.id;
      const targetViewId = targetView.id;
      const sourceIndex = sourceRow.idx;
      // Drag the parent folder to the child page, return
      if (props.pathStr.split('-').includes(draggedFolderId)) return;
      props.onMoveFolder(
        draggedFolderId,
        targetViewId,
        sourceIndex > targetIndex ? 'move_above' : 'move_below',
      );
      return;
    }
  }
};

const dragCollect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging()
});

const dropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
  draggedPage: monitor.getItem()
});

export default DropTarget('ViewStructure', dropTarget, dropCollect)(
  DragSource('ViewStructure', dragSource, dragCollect)(ViewItem)
);
