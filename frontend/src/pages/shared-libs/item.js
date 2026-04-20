import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link, navigate } from '@gatsbyjs/reach-router';
import { gettext, siteRoot, isPro } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import ModalPortal from '../../components/modal-portal';
import ShareDialog from '../../components/dialog/share-dialog';
import { LIST_MODE } from '../../components/dir-view-mode/constants';
import OpIcon from '../../components/op-icon';
import { formatWithTimezone } from '../../utils/time';

dayjs.extend(relativeTime);

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      showOpIcon: false,
      unshared: false,
      isShowSharedDialog: false,
      isStarred: this.props.data.starred,
      isOpMenuOpen: false
    };
  }

  toggleOpMenu = () => {
    this.setState({
      isOpMenuOpen: !this.state.isOpMenuOpen
    }, () => {
      this.props.freezeItem(this.state.isOpMenuOpen);
    });
  };

  handleMouseOver = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        showOpIcon: true
      });
    }
  };

  handleMouseOut = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: false,
        showOpIcon: false
      });
    }
  };

  share = () => {
    this.setState({ isShowSharedDialog: true });
  };

  leaveShare = () => {
    const data = this.props.data;

    let request;
    if (data.owner_email.indexOf('@seafile_group') == -1) {
      let options = {
        'share_type': 'personal',
        'from': data.owner_email
      };
      request = seafileAPI.leaveShareRepo(data.repo_id, options);
    } else {
      request = seafileAPI.leaveShareGroupOwnedRepo(data.repo_id);
    }

    request.then((res) => {
      this.setState({ unshared: true });
      let message = gettext('Successfully unshared {name}').replace('{name}', data.repo_name);
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        errMessage = gettext('Failed to unshare {name}').replace('{name}', data.repo_name);
      }
      toaster(errMessage);
    });
  };

  toggleShareDialog = () => {
    this.setState({ isShowSharedDialog: false });
  };

  onToggleStarRepo = () => {
    const repoName = this.props.data.repo_name;
    if (this.state.isStarred) {
      seafileAPI.unstarItem(this.props.data.repo_id, '/').then(() => {
        this.setState({ isStarred: !this.state.isStarred });
        const msg = gettext('Successfully unstarred {library_name_placeholder}.')
          .replace('{library_name_placeholder}', repoName);
        toaster.success(msg);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.starItem(this.props.data.repo_id, '/').then(() => {
        this.setState({ isStarred: !this.state.isStarred });
        const msg = gettext('Successfully starred {library_name_placeholder}.')
          .replace('{library_name_placeholder}', repoName);
        toaster.success(msg);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  };

  visitRepo = () => {
    navigate(this.repoURL);
  };

  handleContextMenu = (event) => {
    this.props.onContextMenu(event, this.props.data);
  };

  onMenuItemClick = (operation, event) => {
    switch (operation) {
      case 'Share':
        this.share();
        break;
      case 'Unshare':
        this.leaveShare();
        break;
      default:
        break;
    }
  };

  render() {
    if (this.state.unshared) {
      return null;
    }

    const { isStarred } = this.state;
    const { data, currentViewMode = LIST_MODE } = this.props;
    data.icon_url = Utils.getLibIconUrl(data);
    data.icon_title = Utils.getLibIconTitle(data);

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let shareIconClassName = 'op-icon repo-share-btn' + iconVisibility;
    let leaveShareIconClassName = 'op-icon' + iconVisibility;
    let shareRepoUrl = this.repoURL = `${siteRoot}library/${data.repo_id}/${Utils.encodePath(data.repo_name)}/`;

    if (this.props.isDesktop) {
      return (
        <Fragment>
          {currentViewMode == LIST_MODE ? (
            <div
              className={`repo-list-item ${this.state.highlight ? 'hover' : ''}`}
              onMouseOver={this.handleMouseOver}
              onMouseOut={this.handleMouseOut}
              onFocus={this.handleMouseOver}
              onContextMenu={this.handleContextMenu}
            >
              <div className="repo-item-icon">
                <img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="20" />
              </div>
              <div className="repo-item-name">
                <Link to={shareRepoUrl}>{data.repo_name}</Link>
                {isStarred && (
                  <OpIcon
                    className="star-icon ml-1"
                    symbol="starred"
                    title={gettext('Unstar')}
                  />
                )}
              </div>
              <div className="repo-item-actions">
                <div className="d-flex align-items-center">
                  {(isPro && data.is_admin) &&
                  <OpIcon
                    className={shareIconClassName}
                    symbol="share"
                    title={gettext('Share')}
                    op={this.share}
                  />
                  }
                  <OpIcon
                    className={leaveShareIconClassName}
                    symbol="close"
                    title={gettext('Leave Share')}
                    op={this.leaveShare}
                  />
                </div>
              </div>
              <div className="repo-item-size">{data.size}</div>
              <div className="repo-item-time" title={formatWithTimezone(data.last_modified)}>{dayjs(data.last_modified).fromNow()}</div>
              <div className="repo-item-owner" title={data.owner_contact_email}>{data.owner_name}</div>
            </div>
          ) : (
            <div
              className="library-grid-item"
              onMouseOver={this.handleMouseOver}
              onMouseOut={this.handleMouseOut}
              onFocus={this.handleMouseOver}
              onContextMenu={this.handleContextMenu}
            >
              <div className="d-flex align-items-center">
                <img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="40" className="mr-3" />
                <div className="d-flex flex-column justify-content-center">
                  <Link to={shareRepoUrl} className="text-truncate library-name" title={data.repo_name}>{data.repo_name}</Link>
                  <span className="library-size">{data.size}</span>
                </div>
              </div>
              <div className="flex-shrink-0 d-flex align-items-center">
                {(isPro && data.is_admin) &&
                <OpIcon
                  className={shareIconClassName}
                  title={gettext('Share')}
                  op={this.share}
                />
                }
                <OpIcon
                  className={leaveShareIconClassName}
                  title={gettext('Leave Share')}
                  op={this.leaveShare}
                />
              </div>
            </div>
          )}
          {this.state.isShowSharedDialog && (
            <ModalPortal>
              <ShareDialog
                itemType={'library'}
                itemName={data.repo_name}
                itemPath={'/'}
                repoID={data.repo_id}
                repo={data}
                repoEncrypted={data.encrypted}
                enableDirPrivateShare={true}
                userPerm={data.permission}
                isAdmin={true}
                toggleDialog={this.toggleShareDialog}
              />
            </ModalPortal>
          )}
        </Fragment>
      );
    } else {
      return (
        <Fragment>
          <div
            className={`repo-list-item ${this.state.highlight ? 'highlight' : ''}`}
            onMouseOver={this.handleMouseOver}
            onMouseOut={this.handleMouseOut}
            onClick={this.visitRepo}
          >
            <div className="d-flex align-items-center text-truncate">
              <img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" className="mr-2" />
              <Link to={shareRepoUrl}>{data.repo_name}</Link>
            </div>
            <div className="d-flex align-items-center text-truncate mt-1">
              <span className="item-meta-info" title={data.owner_contact_email}>{data.owner_name}</span>
              <span className="item-meta-info">{data.size}</span>
              <span className="item-meta-info" title={formatWithTimezone(data.last_modified)}>{dayjs(data.last_modified).fromNow()}</span>
            </div>
          </div>
          {this.state.isShowSharedDialog && (
            <ModalPortal>
              <ShareDialog
                itemType={'library'}
                itemName={data.repo_name}
                itemPath={'/'}
                repoID={data.repo_id}
                repo={data}
                repoEncrypted={data.encrypted}
                enableDirPrivateShare={true}
                userPerm={data.permission}
                isAdmin={true}
                toggleDialog={this.toggleShareDialog}
              />
            </ModalPortal>
          )}
        </Fragment>
      );
    }
  }
}

Item.propTypes = {
  currentViewMode: PropTypes.string,
  isDesktop: PropTypes.bool.isRequired,
  data: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  freezeItem: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func.isRequired,
};

export default Item;
