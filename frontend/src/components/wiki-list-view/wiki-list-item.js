import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import WikiPermissionEditor from '../select-editor/wiki-permission-editor.js';
import Toast from '../toast';
import ModalPortal from '../modal-portal';
import WikiDeleteDialog from '../dialog/wiki-delete-dialog';
import Rename from '../rename';

const propTypes = {
  wiki: PropTypes.object.isRequired,
  renameWiki: PropTypes.func.isRequired,
  deleteWiki: PropTypes.func.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
};

class WikiListItem extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isShowWikiMenu: false,
      isShowDeleteDialog: false,
      isShowMenuControl: false,
      isRenameing: false,
      highlight: false,
      permission: this.props.wiki.permission,
      showOpIcon: false,
    };
    this.permissions = ['private', 'public'];
  }

  clickMenuToggle = (e) => {
    e.preventDefault();
    this.onMenuToggle(e);
  }

  onMenuToggle = (e) => {
    let targetType = e.target.dataset.toggle;
    if (targetType !== 'item') {
      if (this.props.isItemFreezed) {
        this.setState({
          highlight: false,
          isShowMenuControl: false,
          isShowWikiMenu: !this.state.isShowWikiMenu
        });
        this.props.onUnfreezedItem();
      } else {
        this.setState({
          isShowWikiMenu: !this.state.isShowWikiMenu
        });
        this.props.onFreezedItem();
      }
    }
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isShowMenuControl: true,
        highlight: true,
        showOpIcon: true,
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isShowMenuControl: false,
        highlight: false,
        showOpIcon: false,
      });
    }
  }

  changePerm = (permission) => {
    let wiki = this.props.wiki;
    seafileAPI.updateWikiPermission(wiki.slug, permission).then(() => {
      this.setState({permission: permission});
    }).catch((error) => {
      if(error.response) {
        let errorMsg = error.response.data.error_msg;
        Toast.danger(errorMsg);
      }
    });
  }

  onRenameToggle = (e) => {
    this.props.onFreezedItem();
    this.setState({
      isShowWikiMenu: false,
      isShowMenuControl: false,
      isRenameing: true,
    });
  }

  onRenameConfirm = (newName) => {
    this.renameWiki(newName);
    this.onRenameCancel();
  }

  onRenameCancel = () => {
    this.props.onUnfreezedItem();
    this.setState({isRenameing: false});
  }
  
  onDeleteToggle = () => {
    this.props.onUnfreezedItem();
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
      isShowWikiMenu: false,
      isShowMenuControl: false,
    });
  }
  
  onDeleteCancel = () => {
    this.props.onUnfreezedItem();
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  }

  renameWiki = (newName) => {
    let wiki = this.props.wiki;
    this.props.renameWiki(wiki, newName);
  }

  deleteWiki = () => {
    let wiki = this.props.wiki;
    this.props.deleteWiki(wiki);
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  }

  render() {
    let wiki = this.props.wiki;
    let userProfileURL = `${siteRoot}profile/${encodeURIComponent(wiki.owner)}/`;

    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td className="name">
            {this.state.isRenameing ?
              <Rename wiki={wiki} name={wiki.name} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel}/> :
              <a href={wiki.link}>{wiki.name}</a>
            }
          </td>
          <td><a href={userProfileURL} target='_blank'>{wiki.owner_nickname}</a></td>
          <td>{moment(wiki.updated_at).fromNow()}</td>
          <td>
            <WikiPermissionEditor 
              isTextMode={true}
              isEditIconShow={this.state.showOpIcon}
              currentPermission={this.state.permission}
              permissions={this.permissions}
              onPermissionChanged={this.changePerm}
            />
          </td>
          <td className="text-center cursor-pointer">
            {this.state.isShowMenuControl && (
              <Dropdown isOpen={this.state.isShowWikiMenu} toggle={this.onMenuToggle}>
                <DropdownToggle 
                  tag="a" 
                  className="fas fa-ellipsis-v" 
                  title={gettext('More Operations')}
                  data-toggle="dropdown" 
                  aria-expanded={this.state.isShowWikiMenu}
                  onClick={this.clickMenuToggle}
                />
                <DropdownMenu>
                  <DropdownItem onClick={this.onRenameToggle}>{gettext('Rename')}</DropdownItem>
                  <DropdownItem onClick={this.onDeleteToggle}>{gettext('Delete')}</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            )}
          </td>
        </tr>
        {this.state.isShowDeleteDialog &&
          <ModalPortal>
            <WikiDeleteDialog
              toggleCancel={this.onDeleteCancel}
              handleSubmit={this.deleteWiki}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

WikiListItem.propTypes = propTypes;

export default WikiListItem;