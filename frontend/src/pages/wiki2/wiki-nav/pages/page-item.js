import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import NameEditPopover from '../../common/name-edit-popover';
import NavItemIcon from '../../common/nav-item-icon';
import PageDropdownMenu from './page-dropdownmenu';
import DeleteDialog from '../../common/delete-dialog';
import { gettext, wikiPermission } from '../../../../utils/constants';
import AddNewPageDialog from '../add-new-page-dialog';
import Icon from '../../../../components/icon';
import DraggedPageItem from './dragged-page-item';
import CustomIcon from '../../custom-icon';

class PageItem extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowNameEditor: false,
      isShowOperationDropdown: false,
      isShowDeleteDialog: false,
      isShowInsertPage: false,
      pageName: props.page.name || '',
      isSelected: props.currentPageId === props.page.id,
      isMouseEnter: false,
    };
    this.pageItemRef = React.createRef();
  }

  componentWillUnmount() {
    this.setState = () => {
      return;
    };
  }

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

  openDeleteDialog = () => {
    this.setState({ isShowDeleteDialog: true });
  };

  closeDeleteDialog = () => {
    this.setState({ isShowDeleteDialog: false });
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
    const { isEditMode, pages, pathStr } = this.props;
    const id = page.id;
    if (!pages.find(item => item.id === id)) return;
    return (
      <DraggedPageItem
        key={id}
        pagesLength={pagesLength}
        isOnlyOnePage={isOnlyOnePage}
        page={Object.assign({}, pages.find(item => item.id === id), page)}
        pageIndex={index}
        isEditMode={isEditMode}
        duplicatePage={this.props.duplicatePage}
        setCurrentPage={this.props.setCurrentPage}
        onUpdatePage={this.props.onUpdatePage}
        onDeletePage={this.props.onDeletePage}
        onMovePage={this.props.onMovePage}
        updateWikiConfig={this.props.updateWikiConfig}
        pages={pages}
        pathStr={pathStr + '-' + page.id}
        currentPageId={this.props.currentPageId}
        addPageInside={this.props.addPageInside}
        getFoldState={this.props.getFoldState}
        toggleExpand={this.props.toggleExpand}
        setClassName={this.props.setClassName}
        getClassName={this.props.getClassName}
        layerDragProps={this.props.layerDragProps}
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
    this.props.addPageInside(Object.assign({ parentPageId: this.props.page.id }, newPage));
  };

  getPageClassName = () => {
    const { isOver, canDrop, isEditMode, layerDragProps } = this.props;
    const isOverPage = isOver && canDrop;
    if (!isOverPage || ! layerDragProps || !layerDragProps.clientOffset) {
      return classnames('wiki-page-item', { 'selected-page': this.state.isSelected }, { 'readonly': !isEditMode });
    }
    let y = layerDragProps.clientOffset.y;
    let top = this.pageItemRef.getBoundingClientRect().y;
    const className = classnames(
      'wiki-page-item',
      { 'dragged-page-over': (top + 10 < y && y < top + 30) },
      { 'page-can-drop-top': (top + 10 > y) },
      { 'page-can-drop-bottom': (top + 30 < y) },
      { 'selected-page': this.state.isSelected },
      { 'readonly': !isEditMode },
    );
    this.props.setClassName(className);
    return className;
  };

  render() {
    const { connectDragSource, connectDragPreview, connectDropTarget,
      page, pagesLength, isEditMode, isOnlyOnePage, pathStr } = this.props;
    const { isShowNameEditor, pageName, isSelected } = this.state;
    if (isSelected) this.setDocUuid(page.docUuid);

    let navItemId = `page-editor-${page.id}`;
    let fn = isEditMode ? connectDragSource : (argu) => { argu; };
    let childNumber = Array.isArray(page.children) ? page.children.length : 0;
    const customIcon = page.icon;
    const folded = this.props.getFoldState(page.id);

    return (
      <div>
        {
          fn(connectDropTarget(
            connectDragPreview(
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
                    {(!this.state.isMouseEnter && childNumber > 0) && (customIcon ? <CustomIcon icon={customIcon} /> : <NavItemIcon symbol={'files'} disable={true} />)}
                    {(this.state.isMouseEnter && childNumber > 0) &&
                      <div className='nav-item-icon' onClick={this.toggleExpand}>
                        <i className={`sf3-font-down sf3-font ${folded ? 'rotate-270' : ''}`}></i>
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
                  {isEditMode && wikiPermission !== 'public' &&
                    <>
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
                            onDeletePage={this.openDeleteDialog}
                          />
                        }
                      </div>
                      <div className="wiki-add-page-btn" onClick={this.toggleInsertPage}>
                        <span className='sf3-font sf3-font-enlarge'></span>
                      </div>
                    </>
                  }
                </div>
                {this.state.isShowDeleteDialog &&
                  <DeleteDialog
                    closeDeleteDialog={this.closeDeleteDialog}
                    handleSubmit={this.props.onDeletePage.bind(this, page.id)}
                  />
                }
                {this.state.isShowInsertPage &&
                  <AddNewPageDialog
                    toggle={this.toggleInsertPage}
                    currentPageId={this.props.page.id}
                    onAddNewPage={this.onAddNewPage}
                    title={gettext('Add page inside')}
                  />
                }
              </div>
            )
          ))
        }
        <div
          className="page-children"
          style={this.getPageChildrenStyle()}
          onClick={this.onClickPageChildren}
        >
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

PageItem.propTypes = {
  isOver: PropTypes.bool,
  canDrop: PropTypes.bool,
  isDragging: PropTypes.bool,
  draggedPage: PropTypes.object,
  isEditMode: PropTypes.bool,
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
  currentPageId: PropTypes.string,
  addPageInside: PropTypes.func,
  getFoldState: PropTypes.func,
  toggleExpand: PropTypes.func,
  updateWikiConfig: PropTypes.func,
  getClassName: PropTypes.func,
  setClassName: PropTypes.func,
};

export default PageItem;
