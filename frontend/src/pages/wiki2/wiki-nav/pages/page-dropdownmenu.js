import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import toaster from '../../../../components/toast';
import { gettext } from '../../../../utils/constants';
import { getWikPageLink } from '../../utils';

export default class PageDropdownMenu extends Component {

  static propTypes = {
    page: PropTypes.object.isRequired,
    pages: PropTypes.array,
    pagesLength: PropTypes.number,
    folderId: PropTypes.string,
    canDelete: PropTypes.bool,
    canDuplicate: PropTypes.bool,
    renderFolderMenuItems: PropTypes.func,
    toggle: PropTypes.func,
    toggleNameEditor: PropTypes.func,
    duplicatePage: PropTypes.func,
    onSetFolderId: PropTypes.func,
    onDeletePage: PropTypes.func,
    onMovePageToFolder: PropTypes.func,
    isOnlyOnePage: PropTypes.bool,
  };

  constructor(props) {
    super(props);
    this.state = {
      isShowMenu: false,
    };
    this.pageNameMap = this.calculateNameMap();
  }

  calculateNameMap = () => {
    const { pages } = this.props;
    return pages.reduce((map, page) => {
      map[page.name] = true;
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

  onRename = (event) => {
    event.nativeEvent.stopImmediatePropagation();
    this.props.toggleNameEditor();
  };

  onDeletePage = (event) => {
    event.nativeEvent.stopImmediatePropagation();
    this.props.onDeletePage();
  };

  onMovePageToFolder = (targetFolderId) => {
    this.props.onMovePageToFolder(targetFolderId);
  };

  onRemoveFromFolder = (evt) => {
    evt.nativeEvent.stopImmediatePropagation();
    this.props.onMovePageToFolder(null);
  };

  onToggleFoldersMenu = () => {
    this.setState({ isShowMenu: !this.state.isShowMenu });
  };

  duplicatePage = () => {
    const { page, folderId } = this.props;
    this.props.onSetFolderId(folderId);
    this.props.duplicatePage({ from_page_id: page.id }, () => {}, this.duplicatePageFailure);
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

  handleCopyLink = () => {
    const { page } = this.props;
    const wikiLink = getWikPageLink(page.id);
    const successText = gettext('Copied link to clipboard');
    const failedText = gettext('Copy failed');

    navigator.clipboard.writeText(wikiLink).then(() => {
      toaster.success(successText);
    }, () => {
      toaster.error(failedText);
    }).catch(void 0);
  };

  handleOpenInNewTab = () => {
    const { page } = this.props;
    const wikiLink = getWikPageLink(page.id);
    window.open(wikiLink);
  };

  render() {
    const {
      folderId, canDelete, canDuplicate, renderFolderMenuItems, pagesLength, isOnlyOnePage,
    } = this.props;
    const folderMenuItems = renderFolderMenuItems && renderFolderMenuItems({ currentFolderId: folderId, onMovePageToFolder: this.onMovePageToFolder });

    return (
      <Dropdown
        isOpen={true}
        toggle={this.onDropdownToggle}
        className="page-operation-dropdown"
      >
        <DropdownToggle className="page-operation-dropdown-toggle" tag="span" data-toggle="dropdown"></DropdownToggle>
        <DropdownMenu
          className="page-operation-dropdown-menu dtable-dropdown-menu large"
          flip={false}
          modifiers={{ preventOverflow: { boundariesElement: document.body } }}
          positionFixed={true}
        >
          <DropdownItem onClick={this.handleCopyLink}>
            <i className="sf3-font sf3-font-link" />
            <span className="item-text">{gettext('Copy link')}</span>
          </DropdownItem>
          <DropdownItem onClick={this.onRename}>
            <i className="sf3-font sf3-font-rename" />
            <span className="item-text">{gettext('Modify name')}</span>
          </DropdownItem>
          {canDuplicate &&
            <DropdownItem onClick={this.duplicatePage}>
              <i className="sf3-font sf3-font-copy1" />
              <span className="item-text">{gettext('Duplicate page')}</span>
            </DropdownItem>
          }
          {(isOnlyOnePage || pagesLength === 1 || !canDelete) ? '' : (
            <DropdownItem onClick={this.onDeletePage}>
              <i className="sf3-font sf3-font-delete1" />
              <span className="item-text">{gettext('Delete page')}</span>
            </DropdownItem>
          )}
          {folderId &&
            <DropdownItem onClick={this.onRemoveFromFolder}>
              <i className="sf3-font sf3-font-move" />
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
                  <i className="sf3-font sf3-font-move" />
                  <span className="item-text">{gettext('Move to')}</span>
                  <span className="icon-dropdown-toggle">
                    <i className="sf3-font-down sf3-font rotate-270"></i>
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
          < hr className='divider' />
          <DropdownItem onClick={this.handleOpenInNewTab}>
            <i className='sf3-font sf3-font-open-in-new-tab' />
            <span className="item-text">{gettext('Open in new tab')}</span>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  }
}
