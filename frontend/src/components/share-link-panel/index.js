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
      toaster.success(gettext('Link deleted'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
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
          <LinkList
            shareLinks={shareLinks}
            permissionOptions={permissionOptions}
            setMode={this.setMode}
            showLinkDetails={this.showLinkDetails}
            toggleSelectAllLinks={this.toggleSelectAllLinks}
            toggleSelectLink={this.toggleSelectLink}
          />
        );
    }
  }
}

ShareLinkPanel.propTypes = propTypes;

export default ShareLinkPanel;
