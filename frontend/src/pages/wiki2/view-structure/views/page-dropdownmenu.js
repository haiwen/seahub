import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import toaster from '../../../../components/toast';
import { gettext } from '../../../../utils/constants';
import Icon from '../../../../components/icon';

export default class PageDropdownMenu extends Component {

  static propTypes = {
    view: PropTypes.object.isRequired,
    views: PropTypes.array,
    pagesLength: PropTypes.number,
    folderId: PropTypes.string,
    canDelete: PropTypes.bool,
    canDuplicate: PropTypes.bool,
    renderFolderMenuItems: PropTypes.func,
    toggle: PropTypes.func,
    toggleViewEditor: PropTypes.func,
    duplicatePage: PropTypes.func,
    onSetFolderId: PropTypes.func,
    onDeleteView: PropTypes.func,
    onModifyViewType: PropTypes.func,
    onMoveViewToFolder: PropTypes.func,
    isOnlyOneView: PropTypes.bool,
  };

  constructor(props) {
    super(props);
    this.state = {
      isShowMenu: false,
    };
    this.pageNameMap = this.calculateNameMap();
  }

  calculateNameMap = () => {
    const { views } = this.props;
    return views.reduce((map, view) => {
      map[view.name] = true;
      return map;
    }, {});
  };

  onDropdownToggle = (evt) => {
    if (evt.target && this.foldersDropdownToggle && this.foldersDropdownToggle.contains(evt.target)) {
      return;
    }
    evt.stopPropagation();
    this.props.toggle();
  };

  onRenameView = (event) => {
    event.nativeEvent.stopImmediatePropagation();
    this.props.toggleViewEditor();
  };

  onDeleteView = (event) => {
    event.nativeEvent.stopImmediatePropagation();
    this.props.onDeleteView();
  };

  onModifyViewType = (event) => {
    event.nativeEvent.stopImmediatePropagation();
    this.props.onModifyViewType();
  };

  onMoveViewToFolder = (targetFolderId) => {
    this.props.onMoveViewToFolder(targetFolderId);
  };

  onRemoveFromFolder = (evt) => {
    evt.nativeEvent.stopImmediatePropagation();
    this.props.onMoveViewToFolder(null);
  };

  onToggleFoldersMenu = () => {
    this.setState({ isShowMenu: !this.state.isShowMenu });
  };

  duplicatePage = () => {
    const { view, folderId } = this.props;
    const { id: from_page_id, name } = view;
    let duplicateCount = 1;
    let newName = name + '(copy)';
    while (this.pageNameMap[newName]) {
      newName = `${name}(copy${duplicateCount})`;
      duplicateCount++;
    }
    const onsuccess = () => {};
    this.props.onSetFolderId(folderId);
    this.props.duplicatePage({ name: newName, from_page_id }, onsuccess, this.duplicatePageFailure);
  };

  duplicatePageFailure = () => {
    toaster.danger(gettext('Failed_to_duplicate_page'));
  };

  showMenu = () => {
    this.setState({ isShowMenu: true });
  };

  hideMenu = () => {
    this.setState({ isShowMenu: false });
  };

  render() {
    const {
      folderId, canDelete, canDuplicate, renderFolderMenuItems, pagesLength, isOnlyOneView,
    } = this.props;
    const folderMenuItems = renderFolderMenuItems && renderFolderMenuItems({ currentFolderId: folderId, onMoveViewToFolder: this.onMoveViewToFolder });
    return (
      <Dropdown
        isOpen={true}
        toggle={this.onDropdownToggle}
        className="view-operation-dropdown"
      >
        <DropdownToggle className="view-operation-dropdown-toggle" tag="span" data-toggle="dropdown"></DropdownToggle>
        <DropdownMenu
          className="view-operation-dropdown-menu dtable-dropdown-menu large"
          flip={false}
          modifiers={{ preventOverflow: { boundariesElement: document.body } }}
          positionFixed={true}
          style={{ zIndex: 1051 }}
        >
          <DropdownItem onClick={this.onRenameView}>
            <Icon symbol={'edit'}/>
            <span className="item-text">{gettext('Modify name')}</span>
          </DropdownItem>
          {canDuplicate &&
            <DropdownItem onClick={this.duplicatePage}>
              <Icon symbol={'copy'}/>
              <span className="item-text">{gettext('Duplicate page')}</span>
            </DropdownItem>
          }
          {(isOnlyOneView || pagesLength === 1 || !canDelete) ? '' : (
            <DropdownItem onClick={this.onDeleteView}>
              <Icon symbol={'delete'}/>
              <span className="item-text">{gettext('Delete page')}</span>
            </DropdownItem>
          )}
          {folderId &&
            <DropdownItem onClick={this.onRemoveFromFolder}>
              <Icon symbol={'remove-from-folder'}/>
              <span className="item-text">{gettext('Remove from folder')}</span>
            </DropdownItem>
          }
          {renderFolderMenuItems && folderMenuItems.length > 0 &&
            <DropdownItem
              className="pr-2 btn-move-to-folder"
              tag="div"
              onClick={(evt) => {
                evt.stopPropagation();
                evt.nativeEvent.stopImmediatePropagation();
                this.showMenu();
              }}
              onMouseEnter={this.showMenu}
              onMouseLeave={this.hideMenu}
            >
              <Dropdown
                className="folders-dropdown"
                direction="right"
                isOpen={this.state.isShowMenu}
                toggle={this.onToggleFoldersMenu}
              >
                <div className="folders-dropdown-toggle" ref={ref => this.foldersDropdownToggle = ref}>
                  <Icon symbol={'move-to'}/>
                  <span className="item-text">{gettext('Move to')}</span>
                  <span className="icon-dropdown-toggle">
                    <Icon className="mr-0" symbol={'right-slide'}/>
                  </span>
                  <DropdownToggle className="move-to-folders-toggle"></DropdownToggle>
                </div>
                {this.state.isShowMenu &&
                  <DropdownMenu
                    className="folders-dropdown-menu"
                    flip={false}
                    modifiers={{ preventOverflow: { boundariesElement: document.body } }}
                    positionFixed={true}
                  >
                    {folderMenuItems}
                  </DropdownMenu>
                }
              </Dropdown>
            </DropdownItem>
          }
        </DropdownMenu>
      </Dropdown>
    );
  }
}
