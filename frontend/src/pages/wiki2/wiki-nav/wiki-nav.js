import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropdownItem } from 'reactstrap';
import { DropTarget, DragLayer } from 'react-dnd';
import html5DragDropContext from './html5DragDropContext';
import DraggedFolderItem from './folders/dragged-folder-item';
import DraggedPageItem from './pages/dragged-page-item';
import WikiNavFooter from './wiki-nav-footer';
import { repoID } from '../../../utils/constants';

import '../css/wiki-nav.css';

class WikiNav extends Component {

  static propTypes = {
    isEditMode: PropTypes.bool,
    navigation: PropTypes.array,
    pages: PropTypes.array,
    onTogglePinViewList: PropTypes.func,
    onToggleAddPage: PropTypes.func,
    onToggleAddFolder: PropTypes.func,
    onModifyFolder: PropTypes.func,
    onDeleteFolder: PropTypes.func,
    onMoveFolder: PropTypes.func,
    setCurrentPage: PropTypes.func,
    onUpdatePage: PropTypes.func,
    onDeletePage: PropTypes.func,
    onMovePage: PropTypes.func,
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

  onMovePageToFolder = (source_page_folder_id, moved_page_id, target_page_folder_id) => {
    this.props.onMovePage({
      moved_page_id,
      source_page_folder_id,
      target_page_folder_id,
      target_page_id: null,
      move_position: 'move_below'
    });
  };

  renderFolderMenuItems = ({ currentFolderId, onMovePageToFolder }) => {
    // folder lists (in the root directory)
    const { navigation } = this.props;
    let renderFolders = navigation.filter(item => item.type === 'folder' && item.id !== currentFolderId);
    return renderFolders.map(folder => {
      const { id, name } = folder;
      return (
        <DropdownItem key={`move-to-folder-${id}`} onClick={onMovePageToFolder.bind(this, id)}>
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

  renderFolder = (folder, index, pagesLength, isOnlyOnePage, id_page_map, layerDragProps) => {
    const { isEditMode, pages } = this.props;
    const folderId = folder.id;
    return (
      <DraggedFolderItem
        key={`page-folder-${folderId}`}
        isEditMode={isEditMode}
        folder={folder}
        folderIndex={index}
        pagesLength={pagesLength}
        isOnlyOnePage={isOnlyOnePage}
        id_page_map={id_page_map}
        renderFolderMenuItems={this.renderFolderMenuItems}
        toggleExpand={this.toggleExpand}
        onToggleAddPage={this.props.onToggleAddPage}
        onDeleteFolder={this.props.onDeleteFolder}
        onMoveFolder={this.props.onMoveFolder}
        setCurrentPage={this.props.setCurrentPage}
        onUpdatePage={this.props.onUpdatePage}
        duplicatePage={this.props.duplicatePage}
        onSetFolderId={this.props.onSetFolderId}
        onDeletePage={this.props.onDeletePage}
        onMovePageToFolder={this.onMovePageToFolder}
        onMovePage={this.props.onMovePage}
        pages={pages}
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

  renderPage = (page, index, pagesLength, isOnlyOnePage, id_page_map) => {
    const { isEditMode, pages } = this.props;
    const id = page.id;
    if (!pages.find(item => item.id === id)) return;
    const folderId = null; // Pages in the root directory, no folders, use null
    return (
      <DraggedPageItem
        key={id}
        pagesLength={pagesLength}
        isOnlyOnePage={isOnlyOnePage}
        infolder={false}
        page={Object.assign({}, pages.find(item => item.id === id), page)}
        pages={pages}
        pageIndex={index}
        folderId={folderId}
        isEditMode={isEditMode}
        renderFolderMenuItems={this.renderFolderMenuItems}
        duplicatePage={this.props.duplicatePage}
        onSetFolderId={this.props.onSetFolderId}
        setCurrentPage={this.props.setCurrentPage}
        onUpdatePage={this.props.onUpdatePage}
        onDeletePage={this.props.onDeletePage}
        onMovePageToFolder={(targetFolderId) => {
          this.onMovePageToFolder(folderId, page.id, targetFolderId);
        }}
        onMovePage={this.props.onMovePage}
        onMoveFolder={this.props.onMoveFolder}
        pathStr={page.id}
        currentPageId={this.props.currentPageId}
        addPageInside={this.props.addPageInside}
        getFoldState={this.getFoldState}
        toggleExpand={this.toggleExpand}
      />
    );
  };

  // eslint-disable-next-line
  renderStructureBody = React.forwardRef((layerDragProps, ref) => {
    const { navigation, pages, isEditMode } = this.props;
    let isOnlyOnePage = false;
    if (pages.length === 1) {
      isOnlyOnePage = true;
    }
    const pagesLength = pages.length;
    let id_page_map = {};
    pages.forEach(page => id_page_map[page.id] = page);
    const style = { maxHeight: isEditMode ? 'calc(100% - 40px)' : '100%' };
    return (
      <div className='wiki-nav-body' style={style}>
        {navigation.map((item, index) => {
          return item.type === 'folder' ?
            this.renderFolder(item, index, pagesLength, isOnlyOnePage, id_page_map, layerDragProps) :
            this.renderPage(item, index, pagesLength, isOnlyOnePage, id_page_map);
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
      DropTarget('WikiNav', {}, connect => ({
        connectDropTarget: connect.dropTarget()
      }))(DragLayer(this.collect)(this.renderStructureBody))
    );
    return (
      <div className='wiki-nav'>
        <StructureBody />
        {(this.props.isEditMode) &&
          <WikiNavFooter
            onToggleAddPage={this.props.onToggleAddPage}
            onToggleAddFolder={this.props.onToggleAddFolder}
          />
        }
      </div>
    );
  }
}

export default WikiNav;
