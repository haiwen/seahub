import React from 'react';
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
import LinkUserAuth from './link-user-auth';
import LinkEmailAuth from './link-email-auth';

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  closeShareDialog: PropTypes.func.isRequired,
  userPerm: PropTypes.string,
  itemType: PropTypes.string
};

const PER_PAGE = 25;

class ShareLinkPanel extends React.Component {

  constructor(props) {
    super(props);

    this.isExpireDaysNoLimit = (shareLinkExpireDaysMin === 0 && shareLinkExpireDaysMax === 0 && shareLinkExpireDaysDefault == 0);
    this.defaultExpireDays = this.isExpireDaysNoLimit ? '' : shareLinkExpireDaysDefault;

    this.state = {
      isLoading: true,
      hasMore: false,
      isLoadingMore: false,
      page: 1,
      mode: 'listLinks',
      sharedLinkInfo: null,
      shareLinks: [],
      permissionOptions: [],
      currentPermission: ''
    };
  }

  componentDidMount() {
    const { page } = this.state;
    const { repoID, itemPath: path } = this.props;
    seafileAPI.listShareLinks({repoID, path, page}).then((res) => {
      this.setState({
        isLoading: false,
        hasMore: res.data.length == PER_PAGE,
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
  };

  updateLink = (link) => {
    const { shareLinks } = this.state;
    this.setState({
      sharedLinkInfo: link,
      shareLinks: shareLinks.map(item => item.token == link.token ? link : item)
    });
  };

  deleteLink = (token) => {
    const { shareLinks } = this.state;
    seafileAPI.deleteShareLink(token).then(() => {
      this.setState({
        mode: '',
        sharedLinkInfo: null,
        shareLinks: shareLinks.filter(item => item.token !== token)
      });
      toaster.success(gettext('Successfully deleted 1 share link'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  deleteShareLinks = () => {
    const { shareLinks } = this.state;
    const tokens = shareLinks.filter(item => item.isSelected).map(link => link.token);
    seafileAPI.deleteShareLinks(tokens).then(res => {
      const { success, failed } = res.data;
      if (success.length) {
        let newShareLinkList = shareLinks.filter(shareLink => {
          return !success.some(deletedShareLink => {
            return deletedShareLink.token == shareLink.token;
          });
        });
        this.setState({
          shareLinks: newShareLinkList
        });
        const length = success.length;
        const msg = length == 1 ?
          gettext('Successfully deleted 1 share link') :
          gettext('Successfully deleted {number_placeholder} share links')
            .replace('{number_placeholder}', length);
        toaster.success(msg);
      }
      failed.forEach(item => {
        const msg = `${item.token}: ${item.error_msg}`;
        toaster.danger(msg);
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

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
  };

  setMode = (mode, link=null) => {
    this.setState({ mode: mode});
    if (link) {
      this.setState({sharedLinkInfo: link});
    }
  };

  toggleSelectAllLinks = (isSelected) => {
    const { shareLinks: links } = this.state;
    this.setState({
      shareLinks: links.map(item => {
        item.isSelected = isSelected;
        return item;
      })
    });
  };

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
  };

  handleScroll = (event) => {
    if (!this.state.isLoadingMore && this.state.hasMore) {
      const clientHeight = event.target.clientHeight;
      const scrollHeight = event.target.scrollHeight;
      const scrollTop    = event.target.scrollTop;
      const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
      if (isBottom) { // scroll to the bottom
        this.setState({isLoadingMore: true}, () => {
          this.getMore();
        });
      }
    }
  };

  getMore = () => {
    const { page, shareLinks } = this.state;
    const { repoID, itemPath: path } = this.props;
    seafileAPI.listShareLinks({repoID, path, page: page + 1}).then((res) => {
      this.setState({
        isLoadingMore: false,
        hasMore: res.data.length == PER_PAGE,
        page: page + 1,
        shareLinks: shareLinks.concat(res.data.map(item => new ShareLink(item)))
      });
    }).catch(error => {
      this.setState({
        isLoadingMore: false
      });
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    if (this.state.isLoading) {
      return <Loading />;
    }

    const { repoID, itemPath, userPerm } = this.props;
    const { mode, shareLinks, sharedLinkInfo, permissionOptions, currentPermission, isLoadingMore } = this.state;

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
            setMode={this.setMode}
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
      case 'linkUserAuth':
        return (
          <LinkUserAuth
            repoID={repoID}
            linkToken={sharedLinkInfo.token}
            setMode={this.setMode}
            path={itemPath}
          />
        );
      case 'linkEmailAuth':
        return (
          <LinkEmailAuth
            repoID={repoID}
            linkToken={sharedLinkInfo.token}
            setMode={this.setMode}
            path={itemPath}
          />
        );
      default:
        return (
          <LinkList
            shareLinks={shareLinks}
            permissionOptions={permissionOptions}
            setMode={this.setMode}
            showLinkDetails={this.showLinkDetails}
            toggleSelectAllLinks={this.toggleSelectAllLinks}
            toggleSelectLink={this.toggleSelectLink}
            deleteShareLinks={this.deleteShareLinks}
            deleteLink={this.deleteLink}
            handleScroll={this.handleScroll}
            isLoadingMore={isLoadingMore}
          />
        );
    }
  }
}

ShareLinkPanel.propTypes = propTypes;

export default ShareLinkPanel;
