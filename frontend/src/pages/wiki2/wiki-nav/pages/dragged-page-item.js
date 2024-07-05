import { DragSource, DropTarget } from 'react-dnd';
import wikiAPI from '../../../../utils/wiki-api';
import { wikiId } from '../../../../utils/constants';
import PageItem from './page-item';
import {Utils} from '../../../../utils/utils';
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
    if (dragSource.mode === 'wiki-page') {
      const { page: targetPage } = props;
      const draggedPageId = dragSource.data.id;
      const targetPageId = targetPage.id;
      if (draggedPageId !== targetPageId) {
        wikiAPI.moveWiki2Page(wikiId, draggedPageId, targetPageId).then(res => {
          const newConfig = JSON.parse(res.data.wiki_config);
          props.updateWikiConfig(newConfig);
        }).catch((error) => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
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
