import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { isPro, gettext, shareLinkExpireDaysMin, shareLinkExpireDaysMax, shareLinkExpireDaysDefault } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import ShareLink from '../../models/share-link';
import toaster from '../toast';
import Loading from '../loading';
import LinkDetails from './link-details';
import LinkCreation from './link-creation';
import LinkList from './link-list';
import CommonOperationConfirmationDialog from '../../components/dialog/common-operation-confirmation-dialog';

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  closeShareDialog: PropTypes.func.isRequired,
  userPerm: PropTypes.string,
  itemType: PropTypes.string
};

class ShareLinkPanel extends React.Component {

  constructor(props) {
    super(props);

    this.isExpireDaysNoLimit = (shareLinkExpireDaysMin === 0 && shareLinkExpireDaysMax === 0 && shareLinkExpireDaysDefault == 0);
    this.defaultExpireDays = this.isExpireDaysNoLimit ? '' : shareLinkExpireDaysDefault;

    this.state = {
      isLoading: true,
      mode: 'listLinks',
      sharedLinkInfo: null,
      shareLinks: [],
      isDeleteShareLinksDialogOpen: false,
      permissionOptions: [],
      currentPermission: ''
    };
  }

  componentDidMount() {
    let path = this.props.itemPath;
    let repoID = this.props.repoID;
    seafileAPI.getShareLink(repoID, path).then((res) => {
      this.setState({
        isLoading: false,
        shareLinks: res.data.map(item => new ShareLink(item))
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });

    if (isPro) {
      const { itemType, userPerm } = this.props;
      if (itemType == 'library') {
        let permissionOptions = Utils.getShareLinkPermissionList(itemType, userPerm, path);
        this.setState({
          permissionOptions: permissionOptions,
          currentPermission: permissionOptions[0],
        });
      } else {
        let getDirentInfoAPI;
        if (this.props.itemType === 'file') {
          getDirentInfoAPI = seafileAPI.getFileInfo(repoID, path);
        } else if (this.props.itemType === 'dir') {
          getDirentInfoAPI = seafileAPI.getDirInfo(repoID, path);
        }
        getDirentInfoAPI.then((res) => {
          let canEdit = res.data.can_edit;
          let permission = res.data.permission;
          let permissionOptions = Utils.getShareLinkPermissionList(this.props.itemType, permission, path, canEdit);
          this.setState({
            permissionOptions: permissionOptions,
            currentPermission: permissionOptions[0],
          });
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
    }
  }

  showLinkDetails = (link) => {
    this.setState({
      sharedLinkInfo: link,
      mode: link ? 'displayLinkDetails' : ''
    });
  }

  updateLink = (link) => {
    const { shareLinks } = this.state;
    this.setState({
      sharedLinkInfo: link,
      shareLinks: shareLinks.map(item => item.token == link.token ? link : item)
    });
  }

  deleteLink = () => {
    const { sharedLinkInfo, shareLinks } = this.state;
    seafileAPI.deleteShareLink(sharedLinkInfo.token).then(() => {
      this.setState({
        mode: '',
        sharedLinkInfo: null,
        shareLinks: shareLinks.filter(item => item.token !== sharedLinkInfo.token)
      });
      toaster.success(gettext('Successfully deleted 1 share link'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteShareLinks = (shareLink) => {
    let tokens;
    if (shareLink !== undefined) {
      tokens = [shareLink.token]
    } else {
      tokens = this.state.shareLinks.filter(item => item.isSelected).map(link=>(link.token));
    }
    seafileAPI.deleteShareLinks(tokens).then(res => {
      if (res.data.success.length) {
        let oldShareLinkList = this.state.shareLinks;
        let newShareLinkList = oldShareLinkList.filter(oldShareLink => {
          return !res.data.success.some(deletedShareLink =>{
            return deletedShareLink.token == oldShareLink.token;
          });
        });
        this.setState({
          shareLinks: newShareLinkList,
        });
        const length = res.data.success.length;
        const msg = length == 1 ?
          gettext('Successfully deleted 1 share link') :
          gettext('Successfully deleted {number_placeholder} share links')
            .replace('{number_placeholder}', length);
        toaster.success(msg);
      }
      res.data.failed.map(item => {
        const msg = `${item.token}: ${item.error_msg}`;
        toaster.danger(msg);
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggleDeleteShareLinksDialog = () => {
    this.setState({isDeleteShareLinksDialogOpen: !this.state.isDeleteShareLinksDialogOpen});
  }

  updateAfterCreation = (newData) => {
    const { mode, shareLinks: links } = this.state;
    if (mode == 'singleLinkCreation') {
      links.unshift(newData);
      this.setState({
        mode: 'displayLinkDetails',
        sharedLinkInfo: newData,
        shareLinks: links
      });
    } else { // 'linksCreation'
      this.setState({
        mode: '',
        shareLinks: newData.concat(links)
      });
    }
  }

  setMode = (mode) => {
    this.setState({ mode: mode });
  }

  toggleSelectAllLinks = (isSelected) => {
    const { shareLinks: links } = this.state;
    this.setState({
      shareLinks: links.map(item => {
        item.isSelected = isSelected;
        return item;
      })
    });
  }

  toggleSelectLink = (link, isSelected) => {
    const { shareLinks: links } = this.state;
    this.setState({
      shareLinks: links.map(item => {
        if (item.token == link.token) {
          item.isSelected = isSelected;
        }
        return item;
      })
    });
  }

  render() {
    if (this.state.isLoading) {
      return <Loading />;
    }

    const { repoID, itemPath, userPerm } = this.props;
    const { mode, shareLinks, sharedLinkInfo, permissionOptions, currentPermission } = this.state;

    switch (mode) {
      case 'displayLinkDetails':
        return (
          <LinkDetails
            sharedLinkInfo={sharedLinkInfo}
            permissionOptions={permissionOptions}
            defaultExpireDays={this.defaultExpireDays}
            showLinkDetails={this.showLinkDetails}
            updateLink={this.updateLink}
            deleteLink={this.deleteLink}
            closeShareDialog={this.props.closeShareDialog}
          />
        );
      case 'singleLinkCreation':
        return (
          <LinkCreation
            type="single"
            repoID={repoID}
            itemPath={itemPath}
            userPerm={userPerm}
            permissionOptions={permissionOptions}
            currentPermission={currentPermission}
            setMode={this.setMode}
            updateAfterCreation={this.updateAfterCreation}
          />
        );
      case 'linksCreation':
        return (
          <LinkCreation
            type="batch"
            repoID={repoID}
            itemPath={itemPath}
            userPerm={userPerm}
            permissionOptions={permissionOptions}
            currentPermission={currentPermission}
            setMode={this.setMode}
            updateAfterCreation={this.updateAfterCreation}
          />
        );
      default:
        return (
          <Fragment>
          <LinkList
            shareLinks={shareLinks}
            permissionOptions={permissionOptions}
            setMode={this.setMode}
            showLinkDetails={this.showLinkDetails}
            toggleSelectAllLinks={this.toggleSelectAllLinks}
            toggleSelectLink={this.toggleSelectLink}
            toggleDeleteShareLinksDialog={this.toggleDeleteShareLinksDialog}
            deleteShareLinks={this.deleteShareLinks}
          />
          {this.state.isDeleteShareLinksDialogOpen && (
            <CommonOperationConfirmationDialog
              title={gettext('Delete Share Links')}
              message={gettext('Are you sure you want to delete the selected share link(s) ?')}
              executeOperation={this.deleteShareLinks}
              confirmBtnText={gettext('Delete')}
              toggleDialog={this.toggleDeleteShareLinksDialog}
            />
          )}
          </Fragment>
        );
    }
  }
}

ShareLinkPanel.propTypes = propTypes;

export default ShareLinkPanel;
