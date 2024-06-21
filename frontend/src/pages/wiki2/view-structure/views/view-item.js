import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import ViewEditPopover from './view-edit-popover';
import PageDropdownMenu from './page-dropdownmenu';
import DeleteDialog from './delete-dialog';
import { gettext } from '../../../../utils/constants';
import AddNewPageDialog from '../add-new-page-dialog';
import Icon from '../../../../components/icon';
import NavItemIcon from '../nav-item-icon';
import DraggedViewItem from '../views/dragged-view-item';

class ViewItem extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowViewEditor: false,
      isShowViewOperationDropdown: false,
      isShowDeleteDialog: false,
      isShowInsertPage: false,
      viewName: props.view.name || '',
      viewIcon: props.view.icon,
      isSelected: props.currentPageId === props.view.id,
      isMouseEnter: false,
    };
    this.viewItemRef = React.createRef();
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

  onCurrentPageChanged = (currentPageId) => {
    const { isSelected } = this.state;
    if (currentPageId === this.props.view.id && isSelected === false) {
      this.setState({ isSelected: true });
    } else if (currentPageId !== this.props.view.id && isSelected === true) {
      this.setState({ isSelected: false });
    }
  };

  toggleViewEditor = (e) => {
    if (e) e.stopPropagation();
    this.setState({ isShowViewEditor: !this.state.isShowViewEditor }, () => {
      if (!this.state.isShowViewEditor) {
        this.saveViewProperties();
      }
    });
  };

  toggleInsertPage = () => {
    this.setState({ isShowInsertPage: !this.state.isShowInsertPage });
  };

  saveViewProperties = () => {
    const { name, icon, id } = this.props.view;
    const { viewIcon } = this.state;
    let viewName = this.state.viewName.trim();
    if (viewIcon !== icon || viewName !== name) {
      let newView = {};
      if (viewName !== name) {
        newView.name = viewName;
      }
      if (viewIcon !== icon) {
        newView.icon = viewIcon;
      }
      this.props.onUpdatePage(id, newView);
    }
  };

  onChangeName = (newViewName) => {
    this.setState({ viewName: newViewName });
  };

  onChangeIcon = (newViewIcon) => {
    this.setState({ viewIcon: newViewIcon });
  };

  openDeleteDialog = () => {
    this.setState({ isShowDeleteDialog: true });
  };

  closeDeleteDialog = () => {
    this.setState({ isShowDeleteDialog: false });
  };

  onViewOperationDropdownToggle = () => {
    const isShowViewOperationDropdown = !this.state.isShowViewOperationDropdown;
    this.setState({ isShowViewOperationDropdown });
    this.changeItemFreeze(isShowViewOperationDropdown);
  };

  changeItemFreeze = (isFreeze) => {
    if (isFreeze) {
      this.viewItemRef.classList.add('view-freezed');
    } else {
      this.viewItemRef.classList.remove('view-freezed');
    }
  };

  renderIcon = (icon) => {
    if (!icon) {
      return null;
    }
    if (icon.includes('dtable-icon')) {
      return <span className={`mr-2 dtable-font ${icon}`}></span>;
    } else {
      return <Icon className="mr-2" symbol={icon}/>;
    }
  };

  setDocUuid = (docUuid) => {
    window.seafile['docUuid'] = docUuid;
  };

  getFolderChildrenHeight = () => {
    const folded = this.props.getFoldState(this.props.view.id);
    if (folded) return 0;
    return 'auto';
  };

  onClickFolderChildren = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  renderView = (view, index, pagesLength, isOnlyOneView) => {
    const { isEditMode, views, folderId, pathStr } = this.props;
    const id = view.id;
    if (!views.find(item => item.id === id)) return;
    return (
      <DraggedViewItem
        key={id}
        pagesLength={pagesLength}
        isOnlyOneView={isOnlyOneView}
        infolder={false}
        view={Object.assign({}, views.find(item => item.id === id), view)}
        viewIndex={index}
        folderId={folderId}
        isEditMode={isEditMode}
        renderFolderMenuItems={this.props.renderFolderMenuItems}
        duplicatePage={this.props.duplicatePage}
        onSetFolderId={this.props.onSetFolderId}
        onSelectView={this.props.onSelectView}
        onUpdatePage={this.props.onUpdatePage}
        onDeleteView={this.props.onDeleteView}
        onMoveViewToFolder={(targetFolderId) => {
          this.props.onMoveViewToFolder(folderId, view.id, targetFolderId);
        }}
        onMoveView={this.props.onMoveView}
        onMoveFolder={this.props.onMoveFolder}
        views={views}
        pathStr={pathStr + '-' + view.id}
        currentPageId={this.props.currentPageId}
        addPageInside={this.props.addPageInside}
        getFoldState={this.props.getFoldState}
        toggleExpand={this.props.toggleExpand}
      />
    );
  };

  toggleExpand = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.toggleExpand(this.props.view.id);
    this.forceUpdate();
  };

  onAddNewPage = (newPage) => {
    const { view } = this.props;
    this.props.addPageInside(Object.assign({ parentPageId: view.id }, newPage));
  };

  render() {
    const {
      connectDragSource, connectDragPreview, connectDropTarget, isOver, canDrop, isDragging,
      infolder, view, pagesLength, isEditMode, folderId, isOnlyOneView, pathStr,
    } = this.props;
    const { isShowViewEditor, viewName, viewIcon, isSelected } = this.state;
    const isOverView = isOver && canDrop;
    if (isSelected) this.setDocUuid(view.docUuid);

    let viewCanDropTop;
    let viewCanDrop;
    if (infolder) {
      viewCanDropTop = false;
      viewCanDrop = isOverView;
    } else {
      viewCanDropTop = isOverView && isDragging;
      viewCanDrop = isOverView && !isDragging;
    }
    let viewEditorId = `view-editor-${view.id}`;
    let fn = isEditMode ? connectDragSource : (argu) => {argu;};
    let childNumber = Array.isArray(view.children) ? view.children.length : 0;

    const folded = this.props.getFoldState(view.id);
    return (
      <div>
        {
          fn(connectDropTarget(
            connectDragPreview(
              <div
                className={classnames('view-item', 'view',
                  { 'selected-view': isSelected },
                  { 'view-can-drop-top': viewCanDropTop },
                  { 'view-can-drop': viewCanDrop },
                  { 'readonly': !isEditMode },
                )}
                ref={ref => this.viewItemRef = ref}
                onMouseEnter={this.onMouseEnter}
                onMouseMove={this.onMouseMove}
                onMouseLeave={this.onMouseLeave}
                id={viewEditorId}
              >
                <div className="view-item-main" onClick={isShowViewEditor ? () => {} : (e) => this.props.onSelectView(view.id)}>
                  <div className='view-content' style={pathStr ? { marginLeft: `${(pathStr.split('-').length - 1) * 24}px` } : {}}>
                    {childNumber === 0 &&
                      <NavItemIcon symbol={'file'} disable={true} />
                    }
                    {(!this.state.isMouseEnter && childNumber > 0) &&
                      <NavItemIcon symbol={'files'} disable={true} />
                    }
                    {(this.state.isMouseEnter && childNumber > 0) &&
                      <div className='nav-item-icon' onClick={this.toggleExpand}>
                        <i className={`sf3-font-down sf3-font ${folded ? 'rotate-270' : ''}`}></i>
                      </div>
                    }
                    {/* {this.renderIcon(view.icon)} */}
                    <span className="view-title text-truncate" title={view.name}>{view.name}</span>
                    {isShowViewEditor && (
                      <ViewEditPopover
                        viewName={viewName}
                        viewIcon={viewIcon}
                        viewEditorId={viewEditorId}
                        onChangeName={this.onChangeName}
                        onChangeIcon={this.onChangeIcon}
                        toggleViewEditor={this.toggleViewEditor}
                      />
                    )}
                  </div>
                </div>
                <div className="d-flex">
                  {isEditMode &&
                    <>
                      <div className="more-view-operation" onClick={this.onViewOperationDropdownToggle}>
                        <Icon symbol={'more-level'}/>
                        {this.state.isShowViewOperationDropdown &&
                          <PageDropdownMenu
                            view={view}
                            views={this.props.views}
                            pagesLength={pagesLength}
                            isOnlyOneView={isOnlyOneView}
                            folderId={folderId}
                            canDelete={true}
                            canDuplicate={true}
                            toggle={this.onViewOperationDropdownToggle}
                            renderFolderMenuItems={this.props.renderFolderMenuItems}
                            toggleViewEditor={this.toggleViewEditor}
                            duplicatePage={this.props.duplicatePage}
                            onSetFolderId={this.props.onSetFolderId}
                            onDeleteView={this.openDeleteDialog}
                            onMoveViewToFolder={this.props.onMoveViewToFolder}
                          />
                        }
                      </div>
                      <div className="ml-2" onClick={this.toggleInsertPage}>
                        <span className='fas fa-plus'></span>
                      </div>
                    </>
                  }
                </div>
                {this.state.isShowDeleteDialog &&
                  <DeleteDialog
                    closeDeleteDialog={this.closeDeleteDialog}
                    handleSubmit={this.props.onDeleteView.bind(this, view.id)}
                  />
                }
                {this.state.isShowInsertPage &&
                  <AddNewPageDialog
                    toggle={this.toggleInsertPage}
                    onAddNewPage={this.onAddNewPage}
                    title={gettext('Add page inside')}
                  />
                }
              </div>
            )
          ))
        }
        <div
          className="view-folder-children"
          style={{ height: this.getFolderChildrenHeight() }}
          onClick={this.onClickFolderChildren}
        >
          {view.children &&
            view.children.map((item, index) => {
              return this.renderView(item, index, pagesLength, isOnlyOneView);
            })
          }
        </div>
      </div>
    );
  }
}

ViewItem.propTypes = {
  isOver: PropTypes.bool,
  canDrop: PropTypes.bool,
  isDragging: PropTypes.bool,
  draggedPage: PropTypes.object,
  isEditMode: PropTypes.bool,
  infolder: PropTypes.bool,
  view: PropTypes.object,
  folder: PropTypes.object,
  views: PropTypes.array,
  viewIndex: PropTypes.number,
  folderId: PropTypes.string,
  pagesLength: PropTypes.number,
  connectDragSource: PropTypes.func,
  connectDragPreview: PropTypes.func,
  connectDropTarget: PropTypes.func,
  renderFolderMenuItems: PropTypes.func,
  duplicatePage: PropTypes.func,
  onSetFolderId: PropTypes.func,
  onSelectView: PropTypes.func,
  onUpdatePage: PropTypes.func,
  onDeleteView: PropTypes.func,
  onMoveViewToFolder: PropTypes.func,
  onMoveView: PropTypes.func,
  isOnlyOneView: PropTypes.bool,
  onMoveFolder: PropTypes.func,
  pathStr: PropTypes.string,
  currentPageId: PropTypes.string,
  addPageInside: PropTypes.func,
  getFoldState: PropTypes.func,
  toggleExpand: PropTypes.func,
};

export default ViewItem;
