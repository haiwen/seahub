import React, { Component, Fragment } from 'react';
import { DropdownItem } from 'reactstrap';
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
import MobileItemMenu from '../../components/mobile-item-menu';
import { LIST_MODE } from '../../components/dir-view-mode/constants';
import OpIcon from '../../components/op-icon';

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
    let shareIconClassName = 'op-icon sf3-font-share sf3-font repo-share-btn' + iconVisibility;
    let leaveShareIconClassName = 'op-icon sf2-icon-x3' + iconVisibility;
    let shareRepoUrl = this.repoURL = `${siteRoot}library/${data.repo_id}/${Utils.encodePath(data.repo_name)}/`;

    if (this.props.isDesktop) {
      return (
        <Fragment>
          {currentViewMode == LIST_MODE ? (
            <tr
              className={this.state.highlight ? 'tr-highlight' : ''}
              onMouseOver={this.handleMouseOver}
              onMouseOut={this.handleMouseOut}
              onFocus={this.handleMouseOver}
              onContextMenu={this.handleContextMenu}
            >
              <td className="text-center">
                <OpIcon
                  className={`${this.state.isStarred ? 'sf3-font-star' : 'sf3-font-star-empty'} sf3-font`}
                  title={this.state.isStarred ? gettext('Unstar') : gettext('Star')}
                  op={this.onToggleStarRepo}
                />
              </td>
              <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
              <td>
                <Link to={shareRepoUrl}>{data.repo_name}</Link>
              </td>
              <td>
                <div className="d-flex align-items-center">
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
              </td>
              <td>{data.size}</td>
              <td title={dayjs(data.last_modified).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(data.last_modified).fromNow()}</td>
              <td title={data.owner_contact_email}>{data.owner_name}</td>
            </tr>
          ) : (
            <div
              className="library-grid-item px-3 d-flex justify-content-between align-items-center"
              onMouseOver={this.handleMouseOver}
              onMouseOut={this.handleMouseOut}
              onFocus={this.handleMouseOver}
              onContextMenu={this.handleContextMenu}
            >
              <div className="d-flex align-items-center text-truncate">
                <img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="36" className="mr-2" />
                <Link to={shareRepoUrl} className="text-truncate library-name" title={data.repo_name}>{data.repo_name}</Link>
                {isStarred &&
                <OpIcon
                  className='op-icon library-grid-item-icon sf3-font-star sf3-font'
                  title={gettext('Unstar')}
                  op={this.onToggleStarRepo}
                />
                }
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
          <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
            <td onClick={this.visitRepo}><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
            <td onClick={this.visitRepo}>
              <Link to={shareRepoUrl}>{data.repo_name}</Link>
              <br />
              <span className="item-meta-info" title={data.owner_contact_email}>{data.owner_name}</span>
              <span className="item-meta-info">{data.size}</span>
              <span className="item-meta-info" title={dayjs(data.last_modified).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(data.last_modified).fromNow()}</span>
            </td>
            <td>
              <MobileItemMenu isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
                <DropdownItem className="mobile-menu-item" onClick={this.onToggleStarRepo}>
                  {this.state.isStarred ? gettext('Unstar') : gettext('Star')}
                </DropdownItem>
                {(isPro && data.is_admin) &&
                  <DropdownItem className="mobile-menu-item" onClick={this.share}>{gettext('Share')}</DropdownItem>
                }
                <DropdownItem className="mobile-menu-item" onClick={this.leaveShare}>{gettext('Leave Share')}</DropdownItem>
              </MobileItemMenu>
            </td>
          </tr>
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
