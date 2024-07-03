import { DragSource, DropTarget } from 'react-dnd';
import PageItem from './page-item';

const DRAGGED_PAGE_MODE = 'wiki-page';

const dragSource = {
  beginDrag: props => {
    return {
      idx: props.pageIndex,
      data: { ...props.page, index: props.pageIndex },
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
    const { draggedPage, pageIndex: targetIndex } = props;
    const { idx } = draggedPage;
    return idx > targetIndex;
  }
};

const dropTarget = {
  drop(props, monitor) {
    const sourceRow = monitor.getItem();
    // 1 drag page
    if (sourceRow.mode === DRAGGED_PAGE_MODE) {
      const { infolder, pageIndex: targetIndex, page: targetPage, folderId: targetFolderId } = props;
      const sourceFolderId = sourceRow.folderId;
      const draggedPageId = sourceRow.data.id;
      const targetPageId = targetPage.id;

      if (draggedPageId !== targetPageId) {
        const sourceIndex = sourceRow.idx;
        let move_position;
        if (infolder) {
          move_position = 'move_below';
        } else {
          move_position = sourceIndex > targetIndex ? 'move_above' : 'move_below';
        }

        props.onMovePage({
          moved_page_id: draggedPageId,
          target_page_id: targetPageId,
          source_page_folder_id: sourceFolderId,
          target_page_folder_id: targetFolderId,
          move_position,
        });
      }
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

export default DropTarget('WikiNav', dropTarget, dropCollect)(
  DragSource('WikiNav', dragSource, dragCollect)(PageItem)
);
