import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import FolderOperationDropdownMenu from './folder-operation-dropdownmenu';
import ViewItem from '../views/view-item';
import DraggedFolderItem from './dragged-folder-item';
import ViewEditPopover from '../../view-structure/views/view-edit-popover';
import NavItemIcon from '../nav-item-icon';

class FolderItem extends Component {

  constructor(props) {
    super(props);
    const { name, icon } = props.folder;
    this.state = {
      isEditing: false,
      icon: icon || '',
      name: name || '',
      isMouseEnter: false,
    };
  }

  toggleExpand = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.toggleExpand(this.props.folder.id);
    this.forceUpdate();
  };

  onClickFolderChildren = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  openFolderEditor = () => {
    this.setState({ isEditing: true });
  };

  closeFolderEditor = () => {
    if (this.state.isEditing) {
      const { name, icon } = this.state;
      this.props.onModifyFolder(this.props.folder.id, { name, icon });
      this.setState({ isEditing: false });
    }
  };

  onChangeName = (name) => {
    this.setState({ name });
  };

  onChangeIcon = (icon) => {
    this.setState({ icon });
  };

  changeItemFreeze = (isFreeze) => {
    this.isFreeze = true;
    // if (isFreeze) {
    //   this.foldRef.classList.add('fold-freezed');
    // } else {
    //   this.foldRef.classList.remove('fold-freezed');
    // }
  };

  renderFolder = (folder, index, tableGridsLength, isOnlyOneView, id_view_map) => {
    const { isEditMode, views, pathStr } = this.props;
    const { id: folderId } = folder;
    return (
      <DraggedFolderItem
        key={`view-folder-${folderId}`}
        isEditMode={isEditMode}
        folder={folder}
        folderIndex={index}
        tableGridsLength={tableGridsLength}
        isOnlyOneView={isOnlyOneView}
        id_view_map={id_view_map}
        renderFolderMenuItems={this.props.renderFolderMenuItems}
        toggleExpand={this.props.toggleExpand}
        onToggleAddView={this.props.onToggleAddView}
        onModifyFolder={this.props.onModifyFolder}
        onDeleteFolder={this.props.onDeleteFolder}
        onMoveFolder={this.props.onMoveFolder}
        onSelectView={this.props.onSelectView}
        onUpdatePage={this.props.onUpdatePage}
        duplicatePage={this.props.duplicatePage}
        onSetFolderId={this.props.onSetFolderId}
        onDeleteView={this.props.onDeleteView}
        onMoveViewToFolder={this.props.onMoveViewToFolder}
        onMoveView={this.props.onMoveView}
        moveFolderToFolder={this.props.moveFolderToFolder}
        views={views}
        pathStr={pathStr + '-' + folderId}
        setClassName={this.props.setClassName}
        getClassName={this.props.getClassName}
        movePageOut={this.props.movePageOut}
        layerDragProps={this.props.layerDragProps}
        getFoldState={this.props.getFoldState}
        currentPageId={this.props.currentPageId}
        addPageInside={this.props.addPageInside}
      />
    );
  };

  renderView = (view, index, tableGridsLength, isOnlyOneView) => {
    const { isEditMode, views, folder, pathStr } = this.props;
    const id = view.id;
    if (!views.find(item => item.id === id)) return;
    return (
      <ViewItem
        key={id}
        tableGridsLength={tableGridsLength}
        isOnlyOneView={isOnlyOneView}
        infolder={false}
        view={Object.assign({}, views.find(item => item.id === id), view)}
        viewIndex={index}
        folderId={folder.id}
        isEditMode={isEditMode}
        renderFolderMenuItems={this.props.renderFolderMenuItems}
        duplicatePage={this.props.duplicatePage}
        onSetFolderId={this.props.onSetFolderId}
        onSelectView={this.props.onSelectView}
        onUpdatePage={this.props.onUpdatePage}
        onDeleteView={this.props.onDeleteView}
        onMoveViewToFolder={(targetFolderId) => {
          this.props.onMoveViewToFolder(folder.id, view.id, targetFolderId);
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

  getFolderClassName = (layerDragProps, state) => {
    if (!state || ! layerDragProps || !layerDragProps.clientOffset) {
      return 'view-folder-wrapper';
    }
    let y = layerDragProps.clientOffset.y;
    let top = this.foldWrapprRef.getBoundingClientRect().y;
    let className = '';
    // middle
    if (top + 10 < y && y < top + 30) {
      className += ' dragged-view-over ';
    }
    // top
    if (top + 10 > y) {
      className += ' can-drop-top ';
    }
    // bottom
    if (top + 30 < y) {
      className += ' can-drop ';
    }
    this.props.setClassName(className);
    return className + 'view-folder-wrapper';
  };

  getFolderChildrenHeight = () => {
    const folded = this.props.getFoldState(this.props.folder.id);
    if (folded) return 0;
    return 'auto';
  };

  onMouseEnter = () => {
    this.setState({ isMouseEnter: true });
  };

  onMouseLeave = () => {
    this.setState({ isMouseEnter: false });
  };

  render() {
    const {
      connectDropTarget, connectDragPreview, connectDragSource, isOver, canDrop,
      isEditMode, folder, tableGridsLength, id_view_map, isOnlyOneView, layerDragProps,
    } = this.props;
    const { isEditing } = this.state;
    const { id: folderId, name, children } = folder;
    const folded = this.props.getFoldState(folderId);
    let viewEditorId = `folder-item-${folderId}`;
    let fn = isEditMode ? connectDragSource : (argu) => {argu;};
    return (
      <div
        className={classnames('view-folder', { 'readonly': !isEditMode })}
        ref={ref => this.foldRef = ref}
        onClick={this.toggleExpand}
      >
        {fn(connectDropTarget(
          connectDragPreview(
            <div
              className={this.getFolderClassName(layerDragProps, isOver && canDrop)}
              ref={ref => this.foldWrapprRef = ref}
              onMouseEnter={this.onMouseEnter}
              onMouseLeave={this.onMouseLeave}
            >
              <div className='folder-main'>
                <div
                  className='folder-content'
                  style={{ marginLeft: `${(this.props.pathStr.split('-').length - 1) * 16}px` }}
                  id={viewEditorId}
                >
                  {this.state.isMouseEnter ?
                    <NavItemIcon className="icon-expand-folder" symbol={folded ? 'right-slide' : 'drop-down'}/>
                    :
                    <NavItemIcon symbol={'wiki-folder'} disable={true} />
                  }
                  <span className='folder-name text-truncate' title={name}>{name}</span>
                  {isEditing &&
                    <ViewEditPopover
                      viewName={this.state.name}
                      viewEditorId={viewEditorId}
                      viewIcon={this.state.icon}
                      onChangeName={this.onChangeName}
                      onChangeIcon={this.onChangeIcon}
                      toggleViewEditor={this.closeFolderEditor}
                    />
                  }
                </div>
              </div>
              {isEditMode &&
                <FolderOperationDropdownMenu
                  changeItemFreeze={this.changeItemFreeze}
                  openFolderEditor={this.openFolderEditor}
                  onDeleteFolder={this.props.onDeleteFolder}
                  onToggleAddView={this.props.onToggleAddView}
                  folderId={folderId}
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
          {!folded && children &&
            children.map((item, index) => {
              return item.type === 'folder' ? this.renderFolder(item, index, tableGridsLength, isOnlyOneView, id_view_map) : this.renderView(item, index, tableGridsLength, isOnlyOneView);
            })
          }
        </div>
      </div>
    );
  }
}

FolderItem.propTypes = {
  isEditMode: PropTypes.bool,
  folder: PropTypes.object,
  folderIndex: PropTypes.number,
  tableGridsLength: PropTypes.number,
  id_view_map: PropTypes.object,
  isOver: PropTypes.bool,
  canDrop: PropTypes.bool,
  isDragging: PropTypes.bool,
  draggedRow: PropTypes.object,
  connectDropTarget: PropTypes.func,
  connectDragPreview: PropTypes.func,
  connectDragSource: PropTypes.func,
  renderFolderMenuItems: PropTypes.func,
  duplicatePage: PropTypes.func,
  onSetFolderId: PropTypes.func,
  toggleExpand: PropTypes.func,
  onToggleAddView: PropTypes.func,
  onModifyFolder: PropTypes.func,
  onDeleteFolder: PropTypes.func,
  onSelectView: PropTypes.func,
  onUpdatePage: PropTypes.func,
  onDeleteView: PropTypes.func,
  onMoveViewToFolder: PropTypes.func,
  onMoveView: PropTypes.func,
  isOnlyOneView: PropTypes.bool,
  views: PropTypes.array,
  onMoveFolder: PropTypes.func,
  moveFolderToFolder: PropTypes.func,
  pathStr: PropTypes.string,
  setClassName: PropTypes.func,
  getClassName: PropTypes.func,
  movePageOut: PropTypes.func,
  layerDragProps: PropTypes.object,
  getFoldState: PropTypes.func,
  currentPageId: PropTypes.string,
  addPageInside: PropTypes.func,
};

export default FolderItem;
