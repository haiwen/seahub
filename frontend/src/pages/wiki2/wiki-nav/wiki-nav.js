import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { UncontrolledTooltip } from 'reactstrap';
import { useDragLayer, useDrop } from 'react-dnd';
import DraggedPageItem from './pages/dragged-page-item';
import { gettext, wikiPermission } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';

import '../css/wiki-nav.css';

class WikiNav extends Component {

  static propTypes = {
    navigation: PropTypes.array,
    pages: PropTypes.array,
    setCurrentPage: PropTypes.func,
    onUpdatePage: PropTypes.func,
    onDeletePage: PropTypes.func,
    onMovePage: PropTypes.func,
    duplicatePage: PropTypes.func,
    addSiblingPage: PropTypes.func,
    getCurrentPageId: PropTypes.func,
    addPageInside: PropTypes.func,
    updateWikiConfig: PropTypes.func.isRequired,
    toggleTrashDialog: PropTypes.func.isRequired,
    handleAddNewPage: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.folderClassNameCache = '';
    this.lastScrollTop = 0;
    this.wikiNavBodyRef = React.createRef();
    // set init pages are all folded
    this.idFoldedStatusMap = {};
    props.pages.forEach((page) => {
      this.idFoldedStatusMap[page.id] = true;
    });
  }

  getFoldState = (pageId) => {
    return this.idFoldedStatusMap[pageId];
  };

  toggleExpand = (pageId) => {
    const idFoldedStatusMap = this.idFoldedStatusMap;
    if (idFoldedStatusMap[pageId]) {
      delete idFoldedStatusMap[pageId];
    } else {
      idFoldedStatusMap[pageId] = true;
    }
    this.idFoldedStatusMap = idFoldedStatusMap;
  };

  componentDidUpdate(prevProps) {
    if (prevProps.navigation !== this.props.navigation) {
      this.wikiNavBodyRef.current.scrollTop = this.lastScrollTop;
    }
  }

  onWikiNavBodyScroll = (e) => {
    this.lastScrollTop = e.target.scrollTop;
  };

  setClassName = (name) => {
    this.folderClassNameCache = name;
  };

  getClassName = () => {
    return this.folderClassNameCache;
  };

  renderPage = (page, index, pagesLength, isOnlyOnePage, id_page_map, layerDragProps) => {
    const { pages } = this.props;
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
        duplicatePage={this.props.duplicatePage}
        setCurrentPage={this.props.setCurrentPage}
        onUpdatePage={this.props.onUpdatePage}
        onDeletePage={this.props.onDeletePage}
        onMovePage={this.props.onMovePage}
        updateWikiConfig={this.props.updateWikiConfig}
        pathStr={page.id}
        getCurrentPageId={this.props.getCurrentPageId}
        addPageInside={this.props.addPageInside}
        addSiblingPage={this.props.addSiblingPage}
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
    const isDesktop = Utils.isDesktop();
    return (
      <div className='wiki-nav-body' onScroll={this.onWikiNavBodyScroll} ref={this.wikiNavBodyRef}>
        <div className="wiki-nav-group-header d-flex justify-content-between align-items-center px-2">
          <h2 className="h6 font-weight-normal m-0">{gettext('Pages')}</h2>
          {isDesktop && wikiPermission === 'rw' &&
          <div>
            <i
              id='wiki-add-new-page'
              onClick={this.props.handleAddNewPage}
              className='sf3-font sf3-font-enlarge add-new-page'
            >
            </i>
            <UncontrolledTooltip className='wiki-new-page-tooltip' target="wiki-add-new-page">
              {gettext('New page')}
            </UncontrolledTooltip>
          </div>
          }
        </div>
        {navigation.map((item, index) => {
          return this.renderPage(item, index, pages.length, isOnlyOnePage, id_page_map, layerDragProps);
        })}
        {wikiPermission === 'rw' &&
        <>
          <div className="wiki-nav-group-header d-flex justify-content-between align-items-center px-2">
            <h2 className="h6 font-weight-normal m-0">{gettext('Other')}</h2>
          </div>
          <div className={classNames('wiki2-trash', { 'mt-0': !pagesLen })} onClick={this.props.toggleTrashDialog}>
            <span className="sf3-font-trash sf3-font mr-2"></span>
            <span>{gettext('Trash')}</span>
          </div>
        </>
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
    // const StructureBody = html5DragDropContext(
    //   DropTarget('WikiNav', {}, connect => ({
    //     connectDropTarget: connect.dropTarget()
    //   }))(DragLayer(this.collect)(this.renderStructureBody))
    // );
    return (
      <div className='wiki-nav'>
        {this.renderStructureBody()}
      </div>
    );
  }
}

export default WikiNav;
