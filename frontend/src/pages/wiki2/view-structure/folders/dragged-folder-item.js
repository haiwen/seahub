import { DragSource, DropTarget } from 'react-dnd';
import { DRAGGED_FOLDER_MODE, DRAGGED_VIEW_MODE } from '../constant';
import FolderItem from './folder-item';

const dragSource = {
  beginDrag(props, monitor) {
    const { folderIndex, folder } = props;
    return {
      idx: folderIndex,
      data: folder,
      mode: DRAGGED_FOLDER_MODE,
    };
  },
  endDrag(props, monitor) {
    const sourceRow = monitor.getItem();
    const didDrop = monitor.didDrop();
    let targetRow = {};
    if (!didDrop) {
      return { sourceRow, targetRow };
    }
  },
  isDragging(props, monitor) {
    const { folderIndex: currentIndex, draggedRow } = props;
    const { idx } = draggedRow;
    return idx > currentIndex;
  },
};

const dropTarget = {
  drop(props, monitor) {
    const sourceRow = monitor.getItem();
    const { folder: targetFolder } = props;
    const targetFolderId = targetFolder.id;
    const className = props.getClassName();
    if (!className) return;
    let move_position;
    if (className.includes('can-drop')) {
      move_position = 'move_below';
    }
    if (className.includes('can-drop-top')) {
      move_position = 'move_above';
    }
    let moveInto = className.includes('dragged-view-over');

    // 1. drag source is page
    if (sourceRow.mode === DRAGGED_VIEW_MODE) {
      const sourceFolderId = sourceRow.folderId;
      const draggedViewId = sourceRow.data.id;
      // 1.1 move page into folder
      if (moveInto) {
        props.onMoveView({
          moved_view_id: draggedViewId,
          target_view_id: null,
          source_view_folder_id: sourceFolderId,
          target_view_folder_id: targetFolderId,
          move_position,
        });
        return;
      } else { // 1.2 Drag the page above or below the folder
        props.movePageOut(draggedViewId, sourceFolderId, targetFolderId, move_position);
        return;
      }
    }
    // 2. drag source is folder
    if (sourceRow.mode === DRAGGED_FOLDER_MODE) {
      const draggedFolderId = sourceRow.data.id;
      // 2.0 If dragged folder and target folder are the same folder, return
      if (targetFolderId === draggedFolderId) {
        return;
      }
      // 2.1 Do not support drag folder into another folder
      if (moveInto) {
        // props.moveFolderToFolder(draggedFolderId, targetFolderId);
        return;
      } else {
        // 2.2 Drag folder above or below another folder
        props.onMoveFolder(draggedFolderId, targetFolderId, move_position);
      }
      return;
    }
    // 3. Drag other dom
    return;
  }
};

const dragCollect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging(),
});

const dropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
  draggedRow: monitor.getItem(),
  connect,
  monitor,
});

export default DropTarget('ViewStructure', dropTarget, dropCollect)(
  DragSource('ViewStructure', dragSource, dragCollect)(FolderItem)
);
