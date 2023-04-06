import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { isPro, gettext, shareLinkExpireDaysMin, shareLinkExpireDaysMax, shareLinkExpireDaysDefault } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import ShareLink from '../../models/share-link';
import toaster from '../toast';
import Loading from '../loading';
import EmptyTip from '../empty-tip';
import LinkDetails from './link-details';
import LinkItem from './link-item';
import LinkCreation from './link-creation';

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
            <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
              <h6 className="font-weight-normal m-0">{gettext('Share Link')}</h6>
              <div>
                <button className="btn btn-sm btn-outline-primary mr-2" onClick={this.setMode.bind(this, 'singleLinkCreation')}>{gettext('Generate Link')}</button>
                <button className="btn btn-sm btn-outline-primary" onClick={this.setMode.bind(this, 'linksCreation')}>{gettext('Generate links in batch')}</button>
              </div>
            </div>
            {shareLinks.length == 0 ? (
              <EmptyTip forDialog={true}>
                <p className="text-secondary">{gettext('No share links')}</p>
              </EmptyTip>
            ) : (
              <table className="table-hover">
                <thead>
                  <tr>
                    <th width="28%">{gettext('Link')}</th>
                    <th width="30%">{gettext('Permission')}</th>
                    <th width="28%">{gettext('Expiration')}</th>
                    <th width="14%"></th>
                  </tr>
                </thead>
                <tbody>
                  {
                    shareLinks.map((item, index) => {
                      return (
                        <LinkItem
                          key={index}
                          item={item}
                          permissionOptions={permissionOptions}
                          showLinkDetails={this.showLinkDetails}
                        />
                      );
                    })
                  }
                </tbody>
              </table>
            )}
          </Fragment>
        );
    }
  }
}

ShareLinkPanel.propTypes = propTypes;

export default ShareLinkPanel;
