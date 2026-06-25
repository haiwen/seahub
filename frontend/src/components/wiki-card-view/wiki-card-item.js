import React, { Component } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { siteRoot, gettext, username, canPublishWiki } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import ModalPortal from '../modal-portal';
import DeleteWikiDialog from '../dialog/delete-wiki-dialog';
import RenameWikiDialog from '../dialog/rename-wiki-dialog';
import ShareWikiDialog from '../dialog/share-wiki-dialog';
import PublishWikiDialog from '../dialog/publish-wiki-dialog';
import TransferDialog from '../dialog/transfer-dialog';
import wikiAPI from '../../utils/wiki-api';
import toaster from '../toast';
import ConvertWikiDialog from '../dialog/convert-wiki-dialog';
import PublishedWikiEntrance from '../published-wiki-entrance';
import Icon from '../icon';
import CustomDropdown from '../dropdown';

dayjs.extend(relativeTime);

const propTypes = {
  idx: PropTypes.number,
  wiki: PropTypes.object.isRequired,
  group: PropTypes.object,
  deleteWiki: PropTypes.func.isRequired,
  unshareGroupWiki: PropTypes.func.isRequired,
  renameWiki: PropTypes.func.isRequired,
  transferWiki: PropTypes.func.isRequired,
  convertWiki: PropTypes.func,
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
      isShowConvertDialog: false,
      isShowTransferDialog: false,
      customUrlString: this.props.wiki.public_url_suffix,
      enableServerRender: !!this.props.wiki.enable_server_render,
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

  onConvertToggle = (e) => {
    e && e.preventDefault();
    this.setState({
      isShowConvertDialog: !this.state.isShowConvertDialog,
    });
  };

  onPublishToggle = () => {
    this.setState({
      isShowPublishDialog: !this.state.isShowPublishDialog,
    });
  };

  onTransferToggle = () => {
    this.setState({
      isShowTransferDialog: !this.state.isShowTransferDialog,
    });
  };

  handleCustomUrl = (url) => {
    this.setState({
      customUrlString: url,
    });
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

  transferWiki = (owner, reshare) => {
    this.props.transferWiki(this.props.wiki, owner, reshare);
    this.setState({ isShowTransferDialog: false });
  };

  publishWiki = (url, enableServerRender = false) => {
    const urlIndex = url.indexOf('/publish/');
    const publish_url = url.substring(urlIndex + '/publish/'.length);
    wikiAPI.publishWiki(this.props.wiki.id, publish_url, enableServerRender).then((res) => {
      const { publish_url, enable_server_render } = res.data;
      this.setState({
        customUrlString: publish_url,
        enableServerRender: !!enable_server_render,
        isShowPublishDialog: false,
      });
      toaster.success(gettext('Wiki published'));
    }).catch((error) => {
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
        <img className="wiki-card-item-avatar" src={owner_avatar_url} alt={owner_nickname} />
        <span className="wiki-card-item-owner text-truncate" title={owner_nickname}>{owner_nickname}</span>
      </div>
    );
  };

  renderDept = () => {
    const { wiki } = this.props;
    return (
      <div className="wiki-card-item-avatar-container">
        <span className="nav-icon"><Icon symbol="department" /></span>
        <span className="wiki-card-item-owner text-truncate" title={wiki.owner_nickname}>{wiki.owner_nickname}</span>
      </div>
    );
  };

  render() {
    const { idx, wiki, isDepartment, isShowAvatar } = this.props;

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
    let showWikiConvert = false;
    let showTransfer = false;

    if (isDepartment) {
      if (isAdmin) {
        if (isGroupOwner) {
          showDelete = true;
          showShare = true;
          showRename = true;
          showPublish = true;
          showTransfer = !isOldVersion;
          if (isOldVersion) {
            showWikiConvert = true;
          }
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
        showTransfer = !isOldVersion;
        if (isOldVersion) {
          showWikiConvert = true;
        }
      } else {
        showLeaveShare = true;
      }
    }

    if (isOldVersion || showRename || showShare || showDelete || showLeaveShare || showTransfer) {
      showDropdownMenu = true;
    }

    const dropdownItems = [];
    if (showRename) {
      dropdownItems.push({ key: 'rename', label: gettext('Rename'), onClick: this.onRenameToggle });
    }
    if (showPublish && canPublishWiki) {
      dropdownItems.push({ key: 'publish', label: gettext('Publish'), onClick: this.onPublishToggle });
    }
    if (showShare) {
      dropdownItems.push({ key: 'share', label: gettext('Share'), onClick: this.onShareToggle });
    }
    if (showTransfer) {
      dropdownItems.push({ key: 'transfer', label: gettext('Transfer'), onClick: this.onTransferToggle });
    }
    if (isOldVersion) {
      dropdownItems.push({ key: 'unpublish', label: gettext('Unpublish'), onClick: this.onDeleteToggle });
    }
    if (showDelete) {
      dropdownItems.push({ key: 'delete', label: gettext('Delete'), onClick: this.onDeleteToggle });
    }
    if (showWikiConvert) {
      dropdownItems.push({ key: 'convert', label: gettext('Convert to new Wiki'), onClick: this.onConvertToggle });
    }
    if (showLeaveShare) {
      dropdownItems.push({ key: 'leave', label: gettext('Leave'), onClick: this.onDeleteToggle });
    }

    return (
      <>
        <div
          className={`wiki-card-item ${this.state.isItemMenuShow ? 'wiki-card-item-menu-open' : ''}`}
          onClick={this.clickWikiCard.bind(this, isOldVersion ? publishedUrl : editUrl)}
          onKeyDown={Utils.onKeyDown}
          role="button"
          tabIndex="0"
          aria-label={gettext('Visit the wiki')}
        >
          <div className="wiki-card-item-top d-flex align-items-center">
            <span className="wiki-icon"><Icon symbol="wiki" className="w-5 h-5" /></span>
            {this.state.customUrlString && <PublishedWikiEntrance wikiID={wiki.id} customURLPart={this.state.customUrlString} />}
            {showDropdownMenu && (
              <CustomDropdown
                target={`wiki-card-more-op-${idx}`}
                items={dropdownItems}
                className="ml-auto"
                triggerClassName="op-icon op-icon-bg-light"
                onToggle={this.toggleDropDownMenu}
                onMenuHide={() => this.setState({ isItemMenuShow: false })}
              />
            )}
          </div>
          <div className="wiki-item-name text-truncate" title={wikiName} aria-label={wikiName}>{wikiName}</div>
          <div className="wiki-item-owner">
            {isShowAvatar && (isDepartment ? this.renderDept() : this.renderAvatar())}
          </div>
          <div className="wiki-item-bottom">
            {dayjs(wiki.updated_at).fromNow()}
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
              repoEncrypted={false}
              enableDirPrivateShare={true}
              toggleDialog={this.onShareToggle}
            />
          </ModalPortal>
        }
        {this.state.isShowPublishDialog &&
          <ModalPortal>
            <PublishWikiDialog
              toggleCancel={this.onPublishToggle}
              handleCustomUrl={this.handleCustomUrl}
              onPublish={this.publishWiki}
              wiki={wiki}
              customUrlString={this.state.customUrlString}
              enableServerRender={this.state.enableServerRender}
            />
          </ModalPortal>
        }
        {this.state.isShowConvertDialog &&
          <ModalPortal>
            <ConvertWikiDialog
              toggleCancel={this.onConvertToggle}
              convertWiki={this.props.convertWiki}
              wiki={this.props.wiki}
            />
          </ModalPortal>
        }
        {this.state.isShowTransferDialog &&
          <ModalPortal>
            <TransferDialog
              itemName={wiki.name}
              toggleDialog={this.onTransferToggle}
              onTransferRepo={this.transferWiki}
            />
          </ModalPortal>
        }
      </>
    );
  }
}

WikiCardItem.propTypes = propTypes;

export default WikiCardItem;
