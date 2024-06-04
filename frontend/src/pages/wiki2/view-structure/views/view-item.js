import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { DragSource, DropTarget } from 'react-dnd';
import ViewEditPopover from './view-edit-popover';
import PageDropdownMenu from './page-dropdownmenu';
import DeleteDialog from './delete-dialog';
import { DRAGGED_FOLDER_MODE, DRAGGED_VIEW_MODE } from '../constant';
import { gettext } from '../../../../utils/constants';
import AddNewPageDialog from '../add-new-page-dialog';
import Icon from '../../../../components/icon';
import NavItemIcon from '../nav-item-icon';

const dragSource = {
  beginDrag: props => {
    return {
      idx: props.viewIndex,
      data: { ...props.view, index: props.viewIndex },
      folderId: props.folderId,
      mode: DRAGGED_VIEW_MODE,
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
    const { draggedRow, infolder, viewIndex: targetIndex } = props;
    if (infolder) {
      return false;
    }
    const { idx } = draggedRow;
    return idx > targetIndex;
  }
};

const dropTarget = {
  drop(props, monitor) {
    const sourceRow = monitor.getItem();
    // 1 drag page
    if (sourceRow.mode === DRAGGED_VIEW_MODE) {
      const { infolder, viewIndex: targetIndex, view: targetView, folderId: targetFolderId } = props;
      const sourceFolderId = sourceRow.folderId;
      const draggedViewId = sourceRow.data.id;
      const targetViewId = targetView.id;

      if (draggedViewId !== targetViewId) {
        const sourceIndex = sourceRow.idx;
        let move_position;
        if (infolder) {
          move_position = 'move_below';
        } else {
          move_position = sourceIndex > targetIndex ? 'move_above' : 'move_below';
        }

        props.onMoveView({
          moved_view_id: draggedViewId,
          target_view_id: targetViewId,
          source_view_folder_id: sourceFolderId,
          target_view_folder_id: targetFolderId,
          move_position,
        });
      }
      return;
    }
    // 1 drag folder
    if (sourceRow.mode === DRAGGED_FOLDER_MODE) {
      const { viewIndex: targetIndex, view: targetView } = props;
      const draggedFolderId = sourceRow.data.id;
      const targetViewId = targetView.id;
      const sourceIndex = sourceRow.idx;
      // Drag the parent folder to the child page, return
      if (props.pathStr.split('-').includes(draggedFolderId)) return;
      props.onMoveFolder(
        draggedFolderId,
        targetViewId,
        sourceIndex > targetIndex ? 'move_above' : 'move_below',
      );
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
  draggedRow: monitor.getItem()
});

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

  renderView = (view, index, tableGridsLength, isOnlyOneView) => {
    const { isEditMode, views, folder, pathStr } = this.props;
    const id = view.id;
    if (!views.find(item => item.id === id)) return;
    const ViewWrapper = DropTarget('ViewStructure', dropTarget, dropCollect)(
      DragSource('ViewStructure', dragSource, dragCollect)(ViewItem)
    );
    return (
      <ViewWrapper
        key={id}
        tableGridsLength={tableGridsLength}
        isOnlyOneView={isOnlyOneView}
        infolder={false}
        view={Object.assign({}, views.find(item => item.id === id), view)}
        viewIndex={index}
        folderId={folder ? folder.id : ''}
        isEditMode={isEditMode}
        renderFolderMenuItems={this.props.renderFolderMenuItems}
        duplicatePage={this.props.duplicatePage}
        onSetFolderId={this.props.onSetFolderId}
        onSelectView={this.props.onSelectView}
        onUpdatePage={this.props.onUpdatePage}
        onDeleteView={this.props.onDeleteView}
        onMoveViewToFolder={(targetFolderId) => {
          this.props.onMoveViewToFolder(folder ? folder.id : '', view.id, targetFolderId);
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

  render() {
    const {
      connectDragSource, connectDragPreview, connectDropTarget, isOver, canDrop, isDragging,
      infolder, view, tableGridsLength, isEditMode, folderId, isOnlyOneView, pathStr,
    } = this.props;
    const { isShowViewEditor, viewName, viewIcon, isSelected } = this.state;
    const isOverView = isOver && canDrop;
    if (isSelected) this.setDocUuid(view.docUuid);
    const isSpecialInstance = false;

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

    const folded = this.props.getFoldState(view.id);
    return (
      <div onClick={this.toggleExpand}>
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
                onMouseLeave={this.onMouseLeave}
                id={viewEditorId}
              >
                <div className="view-item-main" onClick={isShowViewEditor ? () => {} : (e) => this.props.onSelectView(view.id)}>
                  <div className='view-content' style={pathStr ? { marginLeft: `${(pathStr.split('-').length - 1) * 24}px` } : {}}>
                    {(this.state.isMouseEnter && view.children.length > 0) ?
                      <NavItemIcon className="icon-expand-folder" symbol={folded ? 'right-slide' : 'drop-down'}/>
                      :
                      <NavItemIcon symbol={'file'} disable={true} />
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
                            tableGridsLength={tableGridsLength}
                            isOnlyOneView={isOnlyOneView}
                            folderId={folderId}
                            canDelete={!isSpecialInstance}
                            canDuplicate={!isSpecialInstance}
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
                    onAddNewPage={(obj) => this.props.addPageInside(Object.assign({ parentPageId: view.id }, obj))}
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
              return this.renderView(item, index, tableGridsLength, isOnlyOneView);
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
  draggedRow: PropTypes.object,
  isEditMode: PropTypes.bool,
  infolder: PropTypes.bool,
  view: PropTypes.object,
  folder: PropTypes.object,
  views: PropTypes.array,
  viewIndex: PropTypes.number,
  folderId: PropTypes.string,
  tableGridsLength: PropTypes.number,
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

export default DropTarget('ViewStructure', dropTarget, dropCollect)(
  DragSource('ViewStructure', dragSource, dragCollect)(ViewItem)
);
