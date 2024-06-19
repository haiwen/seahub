import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { DropdownToggle, Dropdown, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import ModalPotal from '../modal-portal';
import ShareDialog from '../dialog/share-dialog';
import EditFileTagDialog from '../dialog/edit-filetag-dialog';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  repoTags: PropTypes.array.isRequired,
  userPerm: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  filePermission: PropTypes.string,
  fileTags: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  dirent: PropTypes.object,
  children: PropTypes.object
};

class ViewFileToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isDropdownMenuOpen: false,
      isMoreMenuShow: false,
      isShareDialogShow: false,
      isEditTagDialogShow: false,
    };
  }

  toggleDropdownMenu = () => {
    this.setState({isDropdownMenuOpen: !this.state.isDropdownMenuOpen});
  };

  onDropdownToggleKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.toggleDropdownMenu();
    }
  };

  onDropDownMouseMove = (e) => {
    if (this.state.isSubMenuShown && e.target && e.target.className === 'dropdown-item') {
      this.setState({
        isSubMenuShown: false
      });
    }
  };

  toggleSubMenu = (e) => {
    e.stopPropagation();
    this.setState({
      isSubMenuShown: !this.state.isSubMenuShown}, () => {
      this.toggleDropdownMenu();
    });
  };

  toggleSubMenuShown = (item) => {
    this.setState({
      isSubMenuShown: true,
      currentItem: item.text
    });
  };

  onMenuItemKeyDown = (item, e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      item.onClick();
    }
  };

  onEditClick = (e) => {
    e.preventDefault();
    let { path, repoID } = this.props;
    let url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(path) + '?mode=edit';
    window.open(url);
  };

  toggleMore = () => {
    this.setState({isMoreMenuShow: !this.state.isMoreMenuShow});
  };

  onShareToggle = () => {
    this.setState({isShareDialogShow: !this.state.isShareDialogShow});
  };

  onEditFileTagToggle = () => {
    this.setState({isEditTagDialogShow: !this.state.isEditTagDialogShow});
  };

  onHistoryClick = () => {
    let historyUrl = siteRoot + 'repo/file_revisions/' + this.props.repoID + '/?p=' + Utils.encodePath(this.props.path);
    location.href = historyUrl;
  };

  render() {
    const { filePermission, showShareBtn } = this.props;
    let opList = [];

    if (filePermission === 'rw' || filePermission === 'cloud-edit') {
      opList.push({
        'icon': 'rename',
        'text': gettext('Edit'),
        'onClick': this.onEditClick
      });
    }
    if (filePermission === 'rw') {
      /*
      let newSubOpList = [];
      if (showShareBtn) {
        newSubOpList.push({
          'text': gettext('Share'),
          'onClick': this.onShareToggle
        });
      }
      newSubOpList.push(
        {'text': gettext('Tags'), 'onClick': this.onEditFileTagToggle},
        {'text': gettext('History'), 'onClick': this.onHistoryClick}
      );

      opList.push({
        'icon': 'more-vertical',
        'text': gettext('More'),
        'subOpList': newSubOpList
      });
      */
      if (showShareBtn) {
        opList.push({
          'icon': 'share',
          'text': gettext('Share'),
          'onClick': this.onShareToggle
        });
      }

      opList.push(
        {'icon': 'tag', 'text': gettext('Tags'), 'onClick': this.onEditFileTagToggle},
        {'icon': 'history', 'text': gettext('History'), 'onClick': this.onHistoryClick}
      );
    }

    return (
      <Fragment>
        {opList.length > 0 &&
        <Dropdown isOpen={this.state.isDropdownMenuOpen} toggle={this.toggleDropdownMenu}>
          <DropdownToggle
            tag="div"
            role="button"
            className="path-item"
            onClick={this.toggleDropdownMenu}
            onKeyDown={this.onDropdownToggleKeyDown}
            data-toggle="dropdown"
          >
            {this.props.children}
            <i className="sf3-font-drop-down sf3-font ml-1 path-item-dropdown-toggle"></i>
          </DropdownToggle>
          <DropdownMenu onMouseMove={this.onDropDownMouseMove}>
            {opList.map((item, index)=> {
              if (item == 'Divider') {
                return <DropdownItem key={index} divider />;
              } else if (item.subOpList) {
                return (
                  <Dropdown
                    key={index}
                    direction="right"
                    className="w-100"
                    isOpen={this.state.isSubMenuShown && this.state.currentItem == item.text}
                    toggle={this.toggleSubMenu}
                    onMouseMove={(e) => {e.stopPropagation();}}
                  >
                    <DropdownToggle
                      caret
                      className="dropdown-item font-weight-normal rounded-0 d-flex align-items-center"
                      onMouseEnter={this.toggleSubMenuShown.bind(this, item)}
                    >
                      <i className={`sf3-font-${item.icon} sf3-font mr-2 dropdown-item-icon`}></i>
                      <span className="mr-auto">{item.text}</span>
                    </DropdownToggle>
                    <DropdownMenu>
                      {item.subOpList.map((item, index)=> {
                        if (item == 'Divider') {
                          return <DropdownItem key={index} divider />;
                        } else {
                          return (<DropdownItem key={index} onClick={item.onClick} onKeyDown={this.onMenuItemKeyDown.bind(this, item)}>{item.text}</DropdownItem>);
                        }
                      })}
                    </DropdownMenu>
                  </Dropdown>
                );
              } else {
                return (
                  <DropdownItem key={index} onClick={item.onClick} onKeyDown={this.onMenuItemKeyDown.bind(this, item)}>
                    <i className={`sf3-font-${item.icon} sf3-font mr-2 dropdown-item-icon`}></i>
                    {item.text}
                  </DropdownItem>
                );
              }
            })}
          </DropdownMenu>
        </Dropdown>
        }
        {this.state.isShareDialogShow && (
          <ModalPotal>
            <ShareDialog
              itemType={'file'}
              itemName={Utils.getFileName(this.props.path)}
              itemPath={this.props.path}
              repoID={this.props.repoID}
              repoEncrypted={this.props.repoEncrypted}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              userPerm={this.props.userPerm}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              toggleDialog={this.onShareToggle}
            />
          </ModalPotal>
        )}
        {this.state.isEditTagDialogShow && (
          <ModalPotal>
            <EditFileTagDialog
              filePath={this.props.path}
              repoID={this.props.repoID}
              repoTags={this.props.repoTags}
              fileTagList={this.props.fileTags}
              toggleCancel={this.onEditFileTagToggle}
              onFileTagChanged={this.props.onFileTagChanged}
            />
          </ModalPotal>
        )}
      </Fragment>
    );
  }
}

ViewFileToolbar.propTypes = propTypes;

export default ViewFileToolbar;
