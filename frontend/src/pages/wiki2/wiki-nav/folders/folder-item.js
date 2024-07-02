import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import FolderOperationDropdownMenu from './folder-operation-dropdownmenu';
import DraggedPageItem from '../pages/dragged-page-item';
import DraggedFolderItem from './dragged-folder-item';
import NameEditPopover from '../../common/name-edit-popover';
import NavItemIcon from '../../common/nav-item-icon';

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
  };

  renderFolder = (folder, index, pagesLength, isOnlyOnePage, id_page_map) => {
    const { isEditMode, pages, pathStr } = this.props;
    const { id: folderId } = folder;
    return (
      <DraggedFolderItem
        key={`page-folder-${folderId}`}
        isEditMode={isEditMode}
        folder={folder}
        folderIndex={index}
        pagesLength={pagesLength}
        isOnlyOnePage={isOnlyOnePage}
        id_page_map={id_page_map}
        renderFolderMenuItems={this.props.renderFolderMenuItems}
        toggleExpand={this.props.toggleExpand}
        onToggleAddPage={this.props.onToggleAddPage}
        onModifyFolder={this.props.onModifyFolder}
        onDeleteFolder={this.props.onDeleteFolder}
        onMoveFolder={this.props.onMoveFolder}
        setCurrentPage={this.props.setCurrentPage}
        onUpdatePage={this.props.onUpdatePage}
        duplicatePage={this.props.duplicatePage}
        onSetFolderId={this.props.onSetFolderId}
        onDeletePage={this.props.onDeletePage}
        onMovePageToFolder={this.props.onMovePageToFolder}
        onMovePage={this.props.onMovePage}
        moveFolderToFolder={this.props.moveFolderToFolder}
        pages={pages}
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

  renderPage = (page, index, pagesLength, isOnlyOnePage) => {
    const { isEditMode, pages, folder, pathStr } = this.props;
    const id = page.id;
    if (!pages.find(item => item.id === id)) return;
    return (
      <DraggedPageItem
        key={id}
        pagesLength={pagesLength}
        isOnlyOnePage={isOnlyOnePage}
        infolder={false}
        page={Object.assign({}, pages.find(item => item.id === id), page)}
        pageIndex={index}
        folderId={folder.id}
        isEditMode={isEditMode}
        renderFolderMenuItems={this.props.renderFolderMenuItems}
        duplicatePage={this.props.duplicatePage}
        onSetFolderId={this.props.onSetFolderId}
        setCurrentPage={this.props.setCurrentPage}
        onUpdatePage={this.props.onUpdatePage}
        onDeletePage={this.props.onDeletePage}
        onMovePageToFolder={(targetFolderId) => {
          this.props.onMovePageToFolder(folder.id, page.id, targetFolderId);
        }}
        onMovePage={this.props.onMovePage}
        onMoveFolder={this.props.onMoveFolder}
        pages={pages}
        pathStr={pathStr + '-' + page.id}
        currentPageId={this.props.currentPageId}
        addPageInside={this.props.addPageInside}
        getFoldState={this.props.getFoldState}
        toggleExpand={this.props.toggleExpand}
      />
    );
  };

  getFolderClassName = (layerDragProps, state) => {
    if (!state || ! layerDragProps || !layerDragProps.clientOffset) {
      return 'page-folder-wrapper';
    }
    let y = layerDragProps.clientOffset.y;
    let top = this.foldWrapprRef.getBoundingClientRect().y;
    let className = '';
    // middle
    if (top + 10 < y && y < top + 30) {
      className += ' dragged-page-over ';
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
    return className + 'page-folder-wrapper';
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
      isEditMode, folder, pagesLength, id_page_map, isOnlyOnePage, layerDragProps,
    } = this.props;
    const { isEditing } = this.state;
    const { id: folderId, name, children } = folder;
    const folded = this.props.getFoldState(folderId);
    let navItemId = `folder-item-${folderId}`;
    let fn = isEditMode ? connectDragSource : (argu) => {argu;};
    return (
      <div
        className={classnames('page-folder', { 'readonly': !isEditMode })}
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
                  id={navItemId}
                >
                  {this.state.isMouseEnter ?
                    <div className='nav-item-icon'>
                      <i className={`sf3-font-down sf3-font ${folded ? 'rotate-270' : ''}`}></i>
                    </div>
                    :
                    <NavItemIcon symbol={'wiki-folder'} disable={true} />
                  }
                  <span className='folder-name text-truncate' title={name}>{name}</span>
                  {isEditing &&
                    <NameEditPopover
                      oldName={this.state.name}
                      targetId={navItemId}
                      onChangeName={this.onChangeName}
                      toggleEditor={this.closeFolderEditor}
                    />
                  }
                </div>
              </div>
              {isEditMode &&
                <FolderOperationDropdownMenu
                  changeItemFreeze={this.changeItemFreeze}
                  openFolderEditor={this.openFolderEditor}
                  onDeleteFolder={this.props.onDeleteFolder}
                  onToggleAddPage={this.props.onToggleAddPage}
                  folderId={folderId}
                />
              }
            </div>
          )
        ))
        }
        <div
          className="page-folder-children"
          style={{ height: this.getFolderChildrenHeight() }}
          onClick={this.onClickFolderChildren}
        >
          {!folded && children &&
            children.map((item, index) => {
              return item.type === 'folder' ? this.renderFolder(item, index, pagesLength, isOnlyOnePage, id_page_map) : this.renderPage(item, index, pagesLength, isOnlyOnePage);
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
  pagesLength: PropTypes.number,
  id_page_map: PropTypes.object,
  isOver: PropTypes.bool,
  canDrop: PropTypes.bool,
  isDragging: PropTypes.bool,
  connectDropTarget: PropTypes.func,
  connectDragPreview: PropTypes.func,
  connectDragSource: PropTypes.func,
  renderFolderMenuItems: PropTypes.func,
  duplicatePage: PropTypes.func,
  onSetFolderId: PropTypes.func,
  toggleExpand: PropTypes.func,
  onToggleAddPage: PropTypes.func,
  onModifyFolder: PropTypes.func,
  onDeleteFolder: PropTypes.func,
  setCurrentPage: PropTypes.func,
  onUpdatePage: PropTypes.func,
  onDeletePage: PropTypes.func,
  onMovePageToFolder: PropTypes.func,
  onMovePage: PropTypes.func,
  isOnlyOnePage: PropTypes.bool,
  pages: PropTypes.array,
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
