import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import NameEditPopover from '../../common/name-edit-popover';
import NavItemIcon from '../../common/nav-item-icon';
import PageDropdownMenu from './page-dropdownmenu';
import { gettext, wikiPermission } from '../../../../utils/constants';
import AddNewPageDialog from '../add-new-page-dialog';
import Icon from '../../../../components/icon';
import DraggedPageItem from './dragged-page-item';
import CustomIcon from '../../custom-icon';
import { eventBus } from '../../../../components/common/event-bus';
import { INSERT_POSITION } from '../constants';

class PageItem extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowNameEditor: false,
      isShowOperationDropdown: false,
      isShowInsertPage: false,
      isShowAddSiblingPage: false,
      insertPosition: '',
      pageName: props.page.name || '',
      isSelected: props.getCurrentPageId() === props.page.id,
      isMouseEnter: false,
    };
    this.pageItemRef = React.createRef();
  }

  componentDidMount() {
    this.unsubscribeEvent = eventBus.subscribe('update-wiki-current-page', this.updateSelected);
  }

  componentWillUnmount() {
    this.unsubscribeEvent();
    this.setState = () => {
      return;
    };
  }

  updateSelected = () => {
    const isSelected = this.props.getCurrentPageId() === this.props.page.id;
    if (isSelected !== this.state.isSelected) {
      this.setState({ isSelected });
    }
  };

  onMouseEnter = () => {
    this.setState({ isMouseEnter: true });
    if (this.state.isSelected) return;
  };

  onMouseMove = () => {
    if (!this.state.isMouseEnter) this.setState({ isMouseEnter: true });
  };

  onMouseLeave = () => {
    this.setState({ isMouseEnter: false });
    if (this.state.isSelected) return;
  };

  toggleNameEditor = (e) => {
    if (e) e.stopPropagation();
    this.setState({ isShowNameEditor: !this.state.isShowNameEditor }, () => {
      if (!this.state.isShowNameEditor) {
        this.savePageProperties();
      }
    });
  };

  toggleInsertPage = () => {
    this.setState({ isShowInsertPage: !this.state.isShowInsertPage });
  };

  toggleInsertSiblingPage = (position) => {
    let insertPosition = null;
    if (position === INSERT_POSITION.BELOW || position === INSERT_POSITION.ABOVE) {
      insertPosition = position;
    }
    this.setState({
      insertPosition,
      isShowAddSiblingPage: !this.state.isShowAddSiblingPage,
    });
  };

  savePageProperties = () => {
    const { name, id } = this.props.page;
    const pageName = this.state.pageName.trim();
    if (pageName !== name) {
      const isUpdateBySide = true;
      this.props.onUpdatePage(id, { name: pageName }, isUpdateBySide);
    }
  };

  onChangeName = (newName) => {
    this.setState({ pageName: newName });
  };

  toggleDropdown = () => {
    const isShowOperationDropdown = !this.state.isShowOperationDropdown;
    this.setState({ isShowOperationDropdown });
    this.changeItemFreeze(isShowOperationDropdown);
  };

  changeItemFreeze = (isFreeze) => {
    if (isFreeze) {
      this.pageItemRef.classList.add('wiki-page-freezed');
    } else {
      this.pageItemRef.classList.remove('wiki-page-freezed');
    }
  };

  setDocUuid = (docUuid) => {
    window.seafile['docUuid'] = docUuid;
  };

  getPageChildrenStyle = () => {
    const folded = this.props.getFoldState(this.props.page.id);
    return folded ? { height: 0, overflowY: 'hidden' } : { height: 'auto', overflowY: 'visible' };
  };

  onClickPageChildren = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  renderPage = (page, index, pagesLength, isOnlyOnePage) => {
    if (!page) return;
    const { pages, pathStr } = this.props;
    const id = page.id;
    if (!pages.find(item => item.id === id)) return;
    return (
      <DraggedPageItem
        key={id}
        pagesLength={pagesLength}
        isOnlyOnePage={isOnlyOnePage}
        page={Object.assign({}, pages.find(item => item.id === id), page)}
        pageIndex={index}
        parentPageId={this.props.page.id}
        duplicatePage={this.props.duplicatePage}
        setCurrentPage={this.props.setCurrentPage}
        onUpdatePage={this.props.onUpdatePage}
        onDeletePage={this.props.onDeletePage}
        onMovePage={this.props.onMovePage}
        updateWikiConfig={this.props.updateWikiConfig}
        pages={pages}
        pathStr={pathStr + '-' + page.id}
        getCurrentPageId={this.props.getCurrentPageId}
        addPageInside={this.props.addPageInside}
        getFoldState={this.props.getFoldState}
        toggleExpand={this.props.toggleExpand}
        setClassName={this.props.setClassName}
        getClassName={this.props.getClassName}
        layerDragProps={this.props.layerDragProps}
        addSiblingPage={this.props.addSiblingPage}
      />
    );
  };

  toggleExpand = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    this.props.toggleExpand(this.props.page.id);
    this.forceUpdate();
  };

  onClickPageItem = () => {
    if (!this.state.isShowNameEditor) {
      this.props.setCurrentPage(this.props.page.id);
    }
  };

  onAddNewPage = (newPage) => {
    const { page } = this.props;
    const folded = this.props.getFoldState(page.id);
    if (folded) {
      this.props.toggleExpand(page.id);
    }
    this.props.addPageInside(Object.assign({ parentPageId: this.props.page.id }, newPage));
  };

  onAddSiblingPage = (newPage) => {
    const { page } = this.props;
    this.props.addSiblingPage(newPage, this.props.parentPageId, this.state.insertPosition, page.id, this.toggleInsertSiblingPage);
  };

  getPageClassName = () => {
    const { isOver, canDrop, layerDragProps } = this.props;
    const isOverPage = isOver && canDrop;
    const readonly = wikiPermission === 'r' || wikiPermission === 'public';
    if (!isOverPage || ! layerDragProps || !layerDragProps.clientOffset) {
      return classnames('wiki-page-item', { 'selected-page': this.state.isSelected }, { 'readonly': readonly });
    }
    let y = layerDragProps.clientOffset.y;
    let top = this.pageItemRef.getBoundingClientRect().y;
    const className = classnames(
      'wiki-page-item',
      { 'dragged-page-over': (top + 10 < y && y < top + 30) },
      { 'page-can-drop-top': (top + 10 > y) },
      { 'page-can-drop-bottom': (top + 30 < y) },
      { 'selected-page': this.state.isSelected },
      { 'readonly': readonly },
    );
    this.props.setClassName(className);
    return className;
  };

  render() {
    const { connectDragSource, connectDragPreview, connectDropTarget, page, pagesLength, isOnlyOnePage, pathStr } = this.props;
    const { isShowNameEditor, pageName, isSelected, isMouseEnter } = this.state;
    if (isSelected) this.setDocUuid(page.docUuid);
    let navItemId = `page-editor-${page.id}`;
    let childNumber = Array.isArray(page.children) ? page.children.length : 0;
    const customIcon = page.icon;
    const folded = this.props.getFoldState(page.id);
    if (wikiPermission === 'rw') {
      return (
        <div>
          {connectDragSource(connectDropTarget(connectDragPreview(
            <div
              className={this.getPageClassName()}
              ref={ref => this.pageItemRef = ref}
              onMouseEnter={this.onMouseEnter}
              onMouseMove={this.onMouseMove}
              onMouseLeave={this.onMouseLeave}
              id={navItemId}
            >
              <div className="wiki-page-item-main" onClick={this.onClickPageItem}>
                <div className='wiki-page-content' style={pathStr ? { marginLeft: `${(pathStr.split('-').length - 1) * 24}px` } : {}}>
                  {childNumber === 0 && (customIcon ? <CustomIcon icon={customIcon} /> : <NavItemIcon symbol={'file'} disable={true} />)
                  }
                  {(!isMouseEnter && childNumber > 0) && (customIcon ? <CustomIcon icon={customIcon} /> : <NavItemIcon symbol={'files'} disable={true} />)}
                  {(isMouseEnter && childNumber > 0) &&
                    <div className='nav-item-icon' onClick={this.toggleExpand} role='button'>
                      <i className={`sf3-font-down sf3-font ${folded ? 'rotate-270' : ''}`} aria-hidden="true"></i>
                    </div>
                  }
                  <span className="wiki-page-title text-truncate" title={page.name}>{page.name}</span>
                  {isShowNameEditor && (
                    <NameEditPopover
                      oldName={pageName}
                      targetId={navItemId}
                      onChangeName={this.onChangeName}
                      toggleEditor={this.toggleNameEditor}
                    />
                  )}
                </div>
              </div>
              <div className="d-none d-md-flex">
                <div className="more-wiki-page-operation" onClick={this.toggleDropdown}>
                  <Icon symbol={'more-level'} />
                  {this.state.isShowOperationDropdown &&
                    <PageDropdownMenu
                      page={page}
                      pages={this.props.pages}
                      pagesLength={pagesLength}
                      isOnlyOnePage={isOnlyOnePage}
                      toggle={this.toggleDropdown}
                      toggleNameEditor={this.toggleNameEditor}
                      duplicatePage={this.props.duplicatePage}
                      onDeletePage={this.props.onDeletePage.bind(this, page.id)}
                      toggleInsertSiblingPage={this.toggleInsertSiblingPage}
                    />
                  }
                </div>
                <div className="wiki-add-page-btn" onClick={this.toggleInsertPage} role='button'>
                  <span className='sf3-font sf3-font-enlarge' aria-hidden="true"></span>
                </div>
              </div>
              {this.state.isShowInsertPage &&
                <AddNewPageDialog
                  toggle={this.toggleInsertPage}
                  onAddNewPage={this.onAddNewPage}
                  title={gettext('Add page inside')}
                  page={this.props.page}
                />
              }
              {this.state.isShowAddSiblingPage &&
                <AddNewPageDialog
                  toggle={this.toggleInsertSiblingPage}
                  onAddNewPage={this.onAddSiblingPage}
                  title={gettext('Add page')}
                  insertPosition={this.state.insertPosition}
                  page={this.props.page}
                />
              }
            </div>
          )))}
          <div className="page-children" style={this.getPageChildrenStyle()} onClick={this.onClickPageChildren}>
            {page.children &&
              page.children.map((item, index) => {
                return this.renderPage(item, index, pagesLength, isOnlyOnePage);
              })
            }
          </div>
        </div>
      );
    } else {
      // permission is 'r' or 'public'
      return (
        <div>
          <div
            className={this.getPageClassName()}
            ref={ref => this.pageItemRef = ref}
            onMouseEnter={this.onMouseEnter}
            onMouseMove={this.onMouseMove}
            onMouseLeave={this.onMouseLeave}
            id={navItemId}
          >
            <div className="wiki-page-item-main" onClick={this.onClickPageItem}>
              <div className='wiki-page-content' style={pathStr ? { marginLeft: `${(pathStr.split('-').length - 1) * 24}px` } : {}}>
                {childNumber === 0 && (customIcon ? <CustomIcon icon={customIcon} /> : <NavItemIcon symbol={'file'} disable={true} />)
                }
                {(!isMouseEnter && childNumber > 0) && (customIcon ? <CustomIcon icon={customIcon} /> : <NavItemIcon symbol={'files'} disable={true} />)}
                {(isMouseEnter && childNumber > 0) &&
                  <div className='nav-item-icon' onClick={this.toggleExpand} role='button'>
                    <i className={`sf3-font-down sf3-font ${folded ? 'rotate-270' : ''}`} aria-hidden="true"></i>
                  </div>
                }
                <span className="wiki-page-title text-truncate" title={page.name}>{page.name}</span>
              </div>
            </div>
            <div className="d-none d-md-flex"></div>
          </div>
          <div className="page-children" style={this.getPageChildrenStyle()} onClick={this.onClickPageChildren}>
            {page.children &&
              page.children.map((item, index) => {
                return this.renderPage(item, index, pagesLength, isOnlyOnePage);
              })
            }
          </div>
        </div>
      );
    }
  }
}

PageItem.propTypes = {
  isOver: PropTypes.bool,
  canDrop: PropTypes.bool,
  isDragging: PropTypes.bool,
  draggedPage: PropTypes.object,
  page: PropTypes.object,
  pages: PropTypes.array,
  pageIndex: PropTypes.number,
  pagesLength: PropTypes.number,
  connectDragSource: PropTypes.func,
  connectDragPreview: PropTypes.func,
  connectDropTarget: PropTypes.func,
  duplicatePage: PropTypes.func,
  setCurrentPage: PropTypes.func,
  onUpdatePage: PropTypes.func,
  onDeletePage: PropTypes.func,
  onMovePage: PropTypes.func,
  isOnlyOnePage: PropTypes.bool,
  pathStr: PropTypes.string,
  getCurrentPageId: PropTypes.func,
  addPageInside: PropTypes.func,
  getFoldState: PropTypes.func,
  toggleExpand: PropTypes.func,
  updateWikiConfig: PropTypes.func,
  getClassName: PropTypes.func,
  setClassName: PropTypes.func,
};

export default PageItem;
