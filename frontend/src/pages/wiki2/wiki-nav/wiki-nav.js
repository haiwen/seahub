import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { UncontrolledTooltip } from 'reactstrap';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import PageItem from './pages/page-item';
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
    this.state = {
      idFoldedStatusMap: {}, // Move idFoldedStatusMap to state
    };
    this.folderClassNameCache = '';
    this.lastScrollTop = 0;
    this.wikiNavBodyRef = React.createRef();
    // Initialize pages as folded
    const idFoldedStatusMap = {};
    props.pages.forEach((page) => {
      idFoldedStatusMap[page.id] = true;
    });
    this.state.idFoldedStatusMap = idFoldedStatusMap;
  }

  getFoldState = (pageId) => {
    return this.state.idFoldedStatusMap[pageId];
  };

  toggleExpand = (pageId) => {
    this.setState((prevState) => {
      const idFoldedStatusMap = { ...prevState.idFoldedStatusMap };
      if (idFoldedStatusMap[pageId]) {
        delete idFoldedStatusMap[pageId];
      } else {
        idFoldedStatusMap[pageId] = true;
      }
      return { idFoldedStatusMap };
    });
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

  renderPage = (page, index, canDeletePage, id_page_map) => {
    const { pages } = this.props;
    const id = page.id;
    if (!pages.find(item => item.id === id)) return;
    return (
      <PageItem
        key={id}
        canDeletePage={canDeletePage}
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
        idFoldedStatusMap={this.idFoldedStatusMap}
        getFoldState={this.getFoldState}
        toggleExpand={this.toggleExpand}
        id_page_map={id_page_map}
        setClassName={this.setClassName}
        getClassName={this.getClassName}
      />
    );
  };

  // eslint-disable-next-line
  renderStructureBody = () => {
    const { navigation, pages } = this.props;
    const pagesLen = pages.length;
    const canDeletePage = navigation.length > 1;
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
          return this.renderPage(item, index, canDeletePage, id_page_map);
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
  };

  render() {
    return (
      <DndProvider backend={HTML5Backend}>
        <div className='wiki-nav'>
          {this.renderStructureBody()}
        </div>
      </DndProvider>
    );
  }
}

export default WikiNav;
