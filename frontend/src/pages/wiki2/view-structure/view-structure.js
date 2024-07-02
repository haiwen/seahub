import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropdownItem } from 'reactstrap';
import { DropTarget, DragLayer } from 'react-dnd';
import html5DragDropContext from './html5DragDropContext';
import DraggedFolderItem from './folders/dragged-folder-item';
import DraggedViewItem from './views/dragged-view-item';
import WikiNavFooter from './wiki-nav-footer';
import { repoID } from '../../../utils/constants';

import '../css/view-structure.css';

class ViewStructure extends Component {

  static propTypes = {
    isEditMode: PropTypes.bool,
    navigation: PropTypes.array,
    views: PropTypes.array,
    onTogglePinViewList: PropTypes.func,
    onToggleAddView: PropTypes.func,
    onToggleAddFolder: PropTypes.func,
    onModifyFolder: PropTypes.func,
    onDeleteFolder: PropTypes.func,
    onMoveFolder: PropTypes.func,
    onSelectView: PropTypes.func,
    onUpdatePage: PropTypes.func,
    onDeleteView: PropTypes.func,
    onMoveView: PropTypes.func,
    moveFolderToFolder: PropTypes.func,
    movePageOut: PropTypes.func,
    duplicatePage: PropTypes.func,
    onSetFolderId: PropTypes.func,
    currentPageId: PropTypes.string,
    addPageInside: PropTypes.func,
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

  getFoldState = (folderId) => {
    return this.idFoldedStatusMap[folderId];
  };

  toggleExpand = (folderId) => {
    const idFoldedStatusMap = this.getFoldedFromLocal();
    if (idFoldedStatusMap[folderId]) {
      delete idFoldedStatusMap[folderId];
    } else {
      idFoldedStatusMap[folderId] = true;
    }
    this.saveFoldedToLocal(idFoldedStatusMap);
    this.idFoldedStatusMap = idFoldedStatusMap;
  };

  onMoveViewToFolder = (source_view_folder_id, moved_view_id, target_view_folder_id) => {
    this.props.onMoveView({
      moved_view_id,
      source_view_folder_id,
      target_view_folder_id,
      target_view_id: null,
      move_position: 'move_below'
    });
  };

  renderFolderMenuItems = ({ currentFolderId, onMoveViewToFolder }) => {
    // folder lists (in the root directory)
    const { navigation } = this.props;
    let renderFolders = navigation.filter(item => item.type === 'folder' && item.id !== currentFolderId);
    return renderFolders.map(folder => {
      const { id, name } = folder;
      return (
        <DropdownItem key={`move-to-folder-${id}`} onClick={onMoveViewToFolder.bind(this, id)}>
          <span className="folder-name text-truncate" title={name}>{name}</span>
        </DropdownItem>
      );
    });
  };

  setClassName = (name) => {
    this.folderClassNameCache = name;
  };

  getClassName = () => {
    return this.folderClassNameCache;
  };

  renderFolder = (folder, index, pagesLength, isOnlyOneView, id_view_map, layerDragProps) => {
    const { isEditMode, views } = this.props;
    const folderId = folder.id;
    return (
      <DraggedFolderItem
        key={`view-folder-${folderId}`}
        isEditMode={isEditMode}
        folder={folder}
        folderIndex={index}
        pagesLength={pagesLength}
        isOnlyOneView={isOnlyOneView}
        id_view_map={id_view_map}
        renderFolderMenuItems={this.renderFolderMenuItems}
        toggleExpand={this.toggleExpand}
        onToggleAddView={this.props.onToggleAddView}
        onDeleteFolder={this.props.onDeleteFolder}
        onMoveFolder={this.props.onMoveFolder}
        onSelectView={this.props.onSelectView}
        onUpdatePage={this.props.onUpdatePage}
        duplicatePage={this.props.duplicatePage}
        onSetFolderId={this.props.onSetFolderId}
        onDeleteView={this.props.onDeleteView}
        onMoveViewToFolder={this.onMoveViewToFolder}
        onMoveView={this.props.onMoveView}
        views={views}
        moveFolderToFolder={this.props.moveFolderToFolder}
        pathStr={folderId}
        layerDragProps={layerDragProps}
        setClassName={this.setClassName}
        getClassName={this.getClassName}
        movePageOut={this.props.movePageOut}
        onModifyFolder={this.props.onModifyFolder}
        getFoldState={this.getFoldState}
        currentPageId={this.props.currentPageId}
        addPageInside={this.props.addPageInside}
      />
    );
  };

  renderView = (view, index, pagesLength, isOnlyOneView, id_view_map) => {
    const { isEditMode, views } = this.props;
    const id = view.id;
    if (!views.find(item => item.id === id)) return;
    const folderId = null; // Pages in the root directory, no folders, use null
    return (
      <DraggedViewItem
        key={id}
        pagesLength={pagesLength}
        isOnlyOneView={isOnlyOneView}
        infolder={false}
        view={Object.assign({}, views.find(item => item.id === id), view)}
        views={views}
        viewIndex={index}
        folderId={folderId}
        isEditMode={isEditMode}
        renderFolderMenuItems={this.renderFolderMenuItems}
        duplicatePage={this.props.duplicatePage}
        onSetFolderId={this.props.onSetFolderId}
        onSelectView={this.props.onSelectView}
        onUpdatePage={this.props.onUpdatePage}
        onDeleteView={this.props.onDeleteView}
        onMoveViewToFolder={(targetFolderId) => {
          this.onMoveViewToFolder(folderId, view.id, targetFolderId);
        }}
        onMoveView={this.props.onMoveView}
        onMoveFolder={this.props.onMoveFolder}
        pathStr={view.id}
        currentPageId={this.props.currentPageId}
        addPageInside={this.props.addPageInside}
        getFoldState={this.getFoldState}
        toggleExpand={this.toggleExpand}
      />
    );
  };

  // eslint-disable-next-line
  renderStructureBody = React.forwardRef((layerDragProps, ref) => {
    const { navigation, views, isEditMode } = this.props;
    let isOnlyOneView = false;
    if (views.length === 1) {
      isOnlyOneView = true;
    }
    const pagesLength = views.length;
    let id_view_map = {};
    views.forEach(view => id_view_map[view.id] = view);
    const style = { maxHeight: isEditMode ? 'calc(100% - 40px)' : '100%' };
    return (
      <div className='wiki-nav-body' style={style}>
        {navigation.map((item, index) => {
          return item.type === 'folder' ?
            this.renderFolder(item, index, pagesLength, isOnlyOneView, id_view_map, layerDragProps) :
            this.renderView(item, index, pagesLength, isOnlyOneView, id_view_map);
        })}
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
      DropTarget('ViewStructure', {}, connect => ({
        connectDropTarget: connect.dropTarget()
      }))(DragLayer(this.collect)(this.renderStructureBody))
    );
    return (
      <div className='view-structure view-structure-light'>
        <StructureBody />
        {(this.props.isEditMode) &&
          <WikiNavFooter
            onToggleAddView={this.props.onToggleAddView}
            onToggleAddFolder={this.props.onToggleAddFolder}
          />
        }
      </div>
    );
  }
}

export default ViewStructure;
