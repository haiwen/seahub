import { useDrag, useDrop } from 'react-dnd';
import PageItem from './page-item';
import wikiAPI from '../../../../utils/wiki-api';
import { wikiId, gettext } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';
import toaster from '../../../../components/toast';

const dragSource = {
  beginDrag: props => {
    return {
      idx: props.pageIndex,
      data: { ...props.page, index: props.pageIndex },
      mode: 'wiki-page',
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
    const dragSource = monitor.getItem();
    const className = props.getClassName();
    let move_position;
    if (className.includes('page-can-drop-bottom')) {
      move_position = 'move_below';
    } else if (className.includes('page-can-drop-top')) {
      move_position = 'move_above';
    } else if (className.includes('dragged-page-over')) {
      move_position = 'move_into';
    }
    if (!move_position) return;
    if (dragSource.mode === 'wiki-page') {
      const targetPage = props.page;
      const draggedPage = dragSource.data;
      const moved_page_id = draggedPage.id;
      const target_page_id = targetPage.id;
      if (moved_page_id === target_page_id) {
        return;
      }
      if (targetPage._path && targetPage._path.includes(moved_page_id)) {
        toaster.danger(gettext('Cannot move parent page to child page'));
        return;
      }
      wikiAPI.moveWiki2Page(wikiId, moved_page_id, target_page_id, move_position).then(res => {
        props.onMovePage({ moved_page_id, target_page_id, move_position });
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
    return;
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

export default PageItem;
