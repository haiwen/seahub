import React, { Component } from 'react';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import PropTypes from 'prop-types';
import moment from 'moment';
import { siteRoot, gettext, username } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import DeleteWikiDialog from '../dialog/delete-wiki-dialog';
import RenameWikiDialog from '../dialog/rename-wiki-dialog';
import ShareWikiDialog from '../dialog/share-wiki-dialog';
import PublishWikiDialog from '../dialog/publish-wiki-dialog';
import wikiAPI from '../../utils/wiki-api';
import toaster from '../toast';

const propTypes = {
  wiki: PropTypes.object.isRequired,
  group: PropTypes.object,
  deleteWiki: PropTypes.func.isRequired,
  unshareGroupWiki: PropTypes.func.isRequired,
  renameWiki: PropTypes.func.isRequired,
  isDepartment: PropTypes.bool.isRequired,
  isShowAvatar: PropTypes.bool.isRequired,
};

class WikiCardItem extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isShowDeleteDialog: false,
      isShowRenameDialog: false,
      isItemMenuShow: false,
      isShowShareDialog: false,
      isShowPublishDialog: false,
      customUrl: '',
    };
  }

  onRenameToggle = (e) => {
    this.setState({
      isShowRenameDialog: !this.state.isShowRenameDialog,
    });
  };

  onShareToggle = (e) => {
    this.setState({
      isShowShareDialog: !this.state.isShowShareDialog,
    });
  };

  onDeleteToggle = (e) => {
    e.preventDefault();
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  };

  onPublishToggle = (e) => {
    this.getPublishWikiLink();
  };

  onDeleteCancel = () => {
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  };

  deleteWiki = () => {
    let wiki = this.props.wiki;
    this.props.deleteWiki(wiki);
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  };

  onItemUnshare = () => {
    let wiki = this.props.wiki;
    this.props.unshareGroupWiki(wiki, this.props.group.group_id);
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  };

  renameWiki = (newName) => {
    if (this.props.wiki.name !== newName) {
      this.props.renameWiki(this.props.wiki, newName);
    }
    this.setState({ isShowRenameDialog: false });
  };

  publishWiki = (url) => {
    const urlIndex = url.indexOf('/publish/');
    const publish_url = url.substring(urlIndex + '/publish/'.length);
    wikiAPI.publishWiki(this.props.wiki.id, publish_url).then((res) => {
      const { publish_url } = res.data;
      this.setState({ customUrl: publish_url });
      toaster.success(gettext('Successfully.'));
    }).catch((error) => {
      if (error.response) {
        let errorMsg = error.response.data.error_msg;
        toaster.danger(errorMsg);
      }
    });
  };

  getPublishWikiLink = () => {
    wikiAPI.getPublishWikiLink(this.props.wiki.id).then((res) => {
      const { publish_url } = res.data;
      this.setState({
        customUrl: publish_url,
        isShowPublishDialog: !this.state.isShowPublishDialog,
      });
    }).catch((error) => {
      this.setState({
        isShowPublishDialog: !this.state.isShowPublishDialog,
      });
      if (error.response) {
        let errorMsg = error.response.data.error_msg;
        toaster.danger(errorMsg);
      }
    });
  };

  clickWikiCard = (link) => {
    window.open(link);
  };

  toggleDropDownMenu = () => {
    this.setState({ isItemMenuShow: !this.state.isItemMenuShow });
  };

  onClickDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  renderAvatar = () => {
    const { owner_nickname, owner_avatar_url } = this.props.wiki;
    return (
      <div className="wiki-card-item-avatar-container">
        <img className="wiki-card-item-avatar" src={owner_avatar_url} alt={owner_nickname}/>
        <span className="wiki-card-item-owner text-truncate" title={owner_nickname}>{owner_nickname}</span>
      </div>
    );
  };

  renderDept = () => {
    const { wiki } = this.props;
    return (
      <div className="wiki-card-item-avatar-container">
        <span className='sf3-font-department sf3-font nav-icon'></span>
        <span className="wiki-card-item-owner text-truncate" title={wiki.owner_nickname}>{wiki.owner_nickname}</span>
      </div>
    );
  };

  render() {
    const { wiki, isDepartment, isShowAvatar } = this.props;
    let isAdmin = false;
    if (wiki.admins) {
      isAdmin = wiki.admins.includes(username);
    }
    let isGroupOwner = false;
    if (this.props.group) {
      isGroupOwner = wiki.owner.split('@')[0] === this.props.group.group_id.toString();
    }
    let isWikiOwner = username === wiki.owner;
    let isOldVersion = wiki.version !== 'v2';
    let publishedUrl = `${siteRoot}published/${encodeURIComponent(wiki.slug)}/`;
    let editUrl = `${siteRoot}wikis/${wiki.id}/`;
    let wikiName = isOldVersion ? `${wiki.name} (old version)` : wiki.name;
    let showRename = false;
    let showShare = false;
    let showDelete = false;
    let showLeaveShare = false;
    let showDropdownMenu = false;
    let showPublish = false;

    if (isDepartment) {
      if (isAdmin) {
        if (isGroupOwner) {
          showDelete = true;
          showShare = true;
          showRename = true;
          showPublish = true;
        } else {
          showLeaveShare = true;
        }
      }
    } else {
      if (isAdmin || isWikiOwner) {
        showShare = true;
        showDelete = true;
        showRename = true;
        showPublish = true;
      } else {
        showLeaveShare = true;
      }
    }

    if (isOldVersion || showRename || showShare || showDelete || showLeaveShare) {
      showDropdownMenu = true;
    }

    return (
      <>
        <div
          className={`wiki-card-item ${this.state.isItemMenuShow ? 'wiki-card-item-menu-open' : ''}`}
          onClick={this.clickWikiCard.bind(this, isOldVersion ? publishedUrl : editUrl)}
        >
          <div className="wiki-card-item-top">
            <span className="sf3-font-wiki sf3-font" aria-hidden="true"></span>
            {showDropdownMenu &&
              <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleDropDownMenu} onClick={this.onClickDropdown}>
                <DropdownToggle
                  tag="i"
                  role="button"
                  tabIndex="0"
                  className="sf-dropdown-toggle sf3-font-more sf3-font"
                  title={gettext('More operations')}
                  aria-label={gettext('More operations')}
                  data-toggle="dropdown"
                  aria-expanded={this.state.isItemMenuShow}
                  aria-haspopup={true}
                  style={{ 'minWidth': '0' }}
                />
                <DropdownMenu right={true} className="dtable-dropdown-menu">
                  {showRename &&
                    <DropdownItem onClick={this.onRenameToggle}>{gettext('Rename')}</DropdownItem>}
                  {showPublish &&
                    <DropdownItem onClick={this.onPublishToggle}>{gettext('Publish')}</DropdownItem>}
                  {showShare &&
                    <DropdownItem onClick={this.onShareToggle}>{gettext('Share')}</DropdownItem>
                  }
                  {isOldVersion &&
                    <DropdownItem onClick={this.onDeleteToggle}>{gettext('Unpublish')}</DropdownItem>
                  }
                  {showDelete &&
                    <DropdownItem onClick={this.onDeleteToggle}>{gettext('Delete')}</DropdownItem>
                  }
                  {showLeaveShare &&
                    <DropdownItem onClick={this.onDeleteToggle}>{gettext('Leave')}</DropdownItem>
                  }
                </DropdownMenu>
              </Dropdown>
            }
          </div>
          <div className="wiki-item-name text-truncate" title={wikiName} aria-label={wikiName}>{wikiName}</div>
          <div className="wiki-item-owner">
            {isShowAvatar && (isDepartment ? this.renderDept() : this.renderAvatar())}
          </div>
          <div className="wiki-item-bottom">
            {moment(wiki.updated_at).fromNow()}
            {wiki.is_published &&
              <span>{gettext('published')}</span>
            }
          </div>
        </div>
        {this.state.isShowDeleteDialog &&
          <ModalPortal>
            {isOldVersion &&
              <DeleteWikiDialog
                toggleCancel={this.onDeleteCancel}
                handleSubmit={this.deleteWiki}
                title={gettext('Unpublish Wiki')}
                content={<p>{gettext('Are you sure you want to unpublish Wiki')}{' '}<b>{wiki.name}</b> ?</p>}
                footer={gettext('Unpublish')}
              />}
            {(isDepartment && isGroupOwner) ?
              <DeleteWikiDialog
                toggleCancel={this.onDeleteCancel}
                handleSubmit={this.deleteWiki}
                title={gettext('Delete Wiki')}
                content={<p>{gettext('Are you sure you want to delete Wiki')}{' '}<b>{wiki.name}</b> ?</p>}
                footer={gettext('Delete')}
              /> : isDepartment ? <DeleteWikiDialog
                toggleCancel={this.onDeleteCancel}
                handleSubmit={this.onItemUnshare}
                title={gettext('Leave Share Wiki')}
                content={<p>{gettext('Are you sure you want to leave share Wiki')}{' '}<b>{wiki.name}</b> ?</p>}
                footer={gettext('Leave')}
              /> : (isWikiOwner ? <DeleteWikiDialog
                toggleCancel={this.onDeleteCancel}
                handleSubmit={this.deleteWiki}
                title={gettext('Delete Wiki')}
                content={<p>{gettext('Are you sure you want to delete Wiki')}{' '}<b>{wiki.name}</b> ?</p>}
                footer={gettext('Delete')}
              /> : <DeleteWikiDialog
                toggleCancel={this.onDeleteCancel}
                handleSubmit={this.deleteWiki}
                title={gettext('Leave Share Wiki')}
                content={<p>{gettext('Are you sure you want to leave share Wiki')}{' '}<b>{wiki.name}</b> ?</p>}
                footer={gettext('Leave')}
              />
              )
            }
          </ModalPortal>
        }
        {this.state.isShowRenameDialog &&
          <ModalPortal>
            <RenameWikiDialog
              toggleCancel={this.onRenameToggle}
              onRename={this.renameWiki}
              wiki={wiki}
            />
          </ModalPortal>
        }
        {this.state.isShowShareDialog &&
          <ModalPortal>
            <ShareWikiDialog
              itemType={'library'}
              itemName={wiki.name}
              itemPath={'/'}
              repoID={wiki.repo_id}
              repoEncrypted={ false }
              enableDirPrivateShare={true}
              toggleDialog={this.onShareToggle}
            />
          </ModalPortal>
        }
        {this.state.isShowPublishDialog &&
          <ModalPortal>
            <PublishWikiDialog
              toggleCancel={this.onPublishToggle}
              onPublish={this.publishWiki}
              wiki={wiki}
              customUrl={this.state.customUrl}
            />
          </ModalPortal>
        }
      </>
    );
  }
}

WikiCardItem.propTypes = propTypes;

export default WikiCardItem;
