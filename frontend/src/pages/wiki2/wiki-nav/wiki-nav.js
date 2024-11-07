import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { DropTarget, DragLayer } from 'react-dnd';
import html5DragDropContext from './html5DragDropContext';
import DraggedPageItem from './pages/dragged-page-item';
import { repoID, gettext, wikiPermission } from '../../../utils/constants';

import '../css/wiki-nav.css';

class WikiNav extends Component {

  static propTypes = {
    isEditMode: PropTypes.bool,
    navigation: PropTypes.array,
    pages: PropTypes.array,
    setCurrentPage: PropTypes.func,
    onUpdatePage: PropTypes.func,
    onDeletePage: PropTypes.func,
    onMovePage: PropTypes.func,
    duplicatePage: PropTypes.func,
    getCurrentPageId: PropTypes.func,
    addPageInside: PropTypes.func,
    updateWikiConfig: PropTypes.func.isRequired,
    toggelTrashDialog: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.folderClassNameCache = '';
    this.idFoldedStatusMap = this.getFoldedFromLocal();
  }

  getFoldedFromLocal = () => {
    const items = window.localStorage.getItem(`wiki-folded-${repoID}`);
    return items ? JSON.parse(items) : {};
  };

  saveFoldedToLocal = (items) => {
    window.localStorage.setItem(`wiki-folded-${repoID}`, JSON.stringify(items));
  };

  getFoldState = (pageId) => {
    return this.idFoldedStatusMap[pageId];
  };

  toggleExpand = (pageId) => {
    const idFoldedStatusMap = this.getFoldedFromLocal();
    if (idFoldedStatusMap[pageId]) {
      delete idFoldedStatusMap[pageId];
    } else {
      idFoldedStatusMap[pageId] = true;
    }
    this.saveFoldedToLocal(idFoldedStatusMap);
    this.idFoldedStatusMap = idFoldedStatusMap;
  };

  setClassName = (name) => {
    this.folderClassNameCache = name;
  };

  getClassName = () => {
    return this.folderClassNameCache;
  };

  renderPage = (page, index, pagesLength, isOnlyOnePage, id_page_map, layerDragProps) => {
    const { isEditMode, pages } = this.props;
    const id = page.id;
    if (!pages.find(item => item.id === id)) return;
    return (
      <DraggedPageItem
        key={id}
        pagesLength={pagesLength}
        isOnlyOnePage={isOnlyOnePage}
        page={Object.assign({}, pages.find(item => item.id === id), page)}
        pages={pages}
        pageIndex={index}
        isEditMode={isEditMode}
        duplicatePage={this.props.duplicatePage}
        setCurrentPage={this.props.setCurrentPage}
        onUpdatePage={this.props.onUpdatePage}
        onDeletePage={this.props.onDeletePage}
        onMovePage={this.props.onMovePage}
        updateWikiConfig={this.props.updateWikiConfig}
        pathStr={page.id}
        getCurrentPageId={this.props.getCurrentPageId}
        addPageInside={this.props.addPageInside}
        getFoldState={this.getFoldState}
        toggleExpand={this.toggleExpand}
        id_page_map={id_page_map}
        layerDragProps={layerDragProps}
        setClassName={this.setClassName}
        getClassName={this.getClassName}
      />
    );
  };

  // eslint-disable-next-line
  renderStructureBody = React.forwardRef((layerDragProps, ref) => {
    const { navigation, pages } = this.props;
    const pagesLen = pages.length;
    const isOnlyOnePage = pagesLen === 1;
    let id_page_map = {};
    pages.forEach(page => id_page_map[page.id] = page);
    return (
      <div className='wiki-nav-body'>
        {navigation.map((item, index) => {
          return this.renderPage(item, index, pages.length, isOnlyOnePage, id_page_map, layerDragProps);
        })}
        {wikiPermission !== 'public' &&
          <div className={classNames('wiki2-trash', { 'mt-0': !pagesLen })} onClick={this.props.toggelTrashDialog}>
            <span className="sf3-font-trash sf3-font mr-2"></span>
            <span>{gettext('Trash')}</span>
          </div>
        }
      </div>
    );
  });

  collect = (monitor) => {
    return {
      item: monitor.getItem(),
      itemType: monitor.getItemType(),
      clientOffset: monitor.getClientOffset(),
      isDragging: monitor.isDragging()
    };
  };

  render() {
    const StructureBody = html5DragDropContext(
      DropTarget('WikiNav', {}, connect => ({
        connectDropTarget: connect.dropTarget()
      }))(DragLayer(this.collect)(this.renderStructureBody))
    );
    return (
      <div className='wiki-nav'>
        <StructureBody />
      </div>
    );
  }
}

export default WikiNav;
