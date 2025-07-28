import React, { Component, Fragment } from 'react';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
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
import RepoMonitoredIcon from '../../components/repo-monitored-icon';
import { LIST_MODE } from '../../components/dir-view-mode/constants';

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

  share = (e) => {
    e.preventDefault();
    this.setState({ isShowSharedDialog: true });
  };

  leaveShare = (e) => {
    e.preventDefault();

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

  watchFileChanges = () => {
    const { data: repo } = this.props;
    seafileAPI.monitorRepo(repo.repo_id).then(() => {
      this.props.onMonitorRepo(repo, true);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  unwatchFileChanges = () => {
    const { data: repo } = this.props;
    seafileAPI.unMonitorRepo(repo.repo_id).then(() => {
      this.props.onMonitorRepo(repo, false);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  handleContextMenu = (event) => {
    this.props.onContextMenu(event, this.props.data);
  };

  onMenuItemClick = (operation, event) => {
    switch (operation) {
      case 'Share':
        this.share(event);
        break;
      case 'Unshare':
        this.leaveShare(event);
        break;
      case 'Watch File Changes':
        this.watchFileChanges();
        break;
      case 'Unwatch File Changes':
        this.unwatchFileChanges();
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

    // at present, only repo shared with 'r', 'rw' can be monitored.(Fri Feb 10 16:24:49 CST 2023)
    const enableMonitorRepo = isPro && (data.permission == 'r' || data.permission == 'rw');

    if (this.props.isDesktop) {
      return (
        <Fragment>
          {currentViewMode == LIST_MODE ? (
            <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver} onContextMenu={this.handleContextMenu}>
              <td className="text-center">
                <i
                  role="button"
                  title={this.state.isStarred ? gettext('Unstar') : gettext('Star')}
                  aria-label={this.state.isStarred ? gettext('Unstar') : gettext('Star')}
                  onClick={this.onToggleStarRepo}
                  className={`op-icon m-0 ${this.state.isStarred ? 'sf3-font-star' : 'sf3-font-star-empty'} sf3-font`}
                >
                </i>
              </td>
              <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
              <td>
                <Fragment>
                  <Link to={shareRepoUrl}>{data.repo_name}</Link>
                  {data.monitored && <RepoMonitoredIcon repoID={data.repo_id} className="ml-1 op-icon" />}
                </Fragment>
              </td>
              <td>
                {(isPro && data.is_admin) &&
                <a href="#" className={shareIconClassName} title={gettext('Share')} role="button" aria-label={gettext('Share')} onClick={this.share}></a>
                }
                <a href="#" className={leaveShareIconClassName} title={gettext('Leave Share')} role="button" aria-label={gettext('Leave Share')} onClick={this.leaveShare}></a>
                {enableMonitorRepo &&
                <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
                  <DropdownToggle
                    tag="i"
                    role="button"
                    tabIndex="0"
                    className={`sf-dropdown-toggle sf3-font-more sf3-font ${iconVisibility}`}
                    title={gettext('More operations')}
                    aria-label={gettext('More operations')}
                    data-toggle="dropdown"
                    aria-expanded={this.state.isOpMenuOpen}
                  />
                  <DropdownMenu>
                    <DropdownItem onClick={data.monitored ? this.unwatchFileChanges : this.watchFileChanges}>{data.monitored ? gettext('Unwatch File Changes') : gettext('Watch File Changes')}</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
                }
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
                  <i
                    role="button"
                    title={gettext('Unstar')}
                    aria-label={gettext('Unstar')}
                    onClick={this.onToggleStarRepo}
                    className='op-icon library-grid-item-icon sf3-font-star sf3-font'
                  >
                  </i>
                }
                {data.monitored && <RepoMonitoredIcon repoID={data.repo_id} className="op-icon library-grid-item-icon" />}
              </div>

              <div className="flex-shrink-0">
                {(isPro && data.is_admin) &&
                <a href="#" className={shareIconClassName} title={gettext('Share')} role="button" aria-label={gettext('Share')} onClick={this.share}></a>
                }
                <a href="#" className={leaveShareIconClassName} title={gettext('Leave Share')} role="button" aria-label={gettext('Leave Share')} onClick={this.leaveShare}></a>
                {enableMonitorRepo &&
                <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
                  <DropdownToggle
                    tag="i"
                    role="button"
                    tabIndex="0"
                    className={`sf-dropdown-toggle sf3-font-more sf3-font ${iconVisibility}`}
                    title={gettext('More operations')}
                    aria-label={gettext('More operations')}
                    data-toggle="dropdown"
                    aria-expanded={this.state.isOpMenuOpen}
                  />
                  <DropdownMenu>
                    <DropdownItem onClick={data.monitored ? this.unwatchFileChanges : this.watchFileChanges}>{data.monitored ? gettext('Unwatch File Changes') : gettext('Watch File Changes')}</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
                }
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
              {data.monitored && <RepoMonitoredIcon repoID={data.repo_id} className="ml-1 op-icon" />}
              <br />
              <span className="item-meta-info" title={data.owner_contact_email}>{data.owner_name}</span>
              <span className="item-meta-info">{data.size}</span>
              <span className="item-meta-info" title={dayjs(data.last_modified).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(data.last_modified).fromNow()}</span>
            </td>
            <td>
              <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
                <DropdownToggle
                  tag="i"
                  className="sf-dropdown-toggle sf3-font sf3-font-more-vertical ml-0"
                  title={gettext('More operations')}
                  data-toggle="dropdown"
                  aria-expanded={this.state.isOpMenuOpen}
                />
                <div className={this.state.isOpMenuOpen ? '' : 'd-none'} onClick={this.toggleOpMenu}>
                  <div className="mobile-operation-menu-bg-layer"></div>
                  <div className="mobile-operation-menu">
                    <DropdownItem className="mobile-menu-item" onClick={this.onToggleStarRepo}>{this.state.isStarred ? gettext('Unstar') : gettext('Star')}</DropdownItem>
                    {(isPro && data.is_admin) && <DropdownItem className="mobile-menu-item" onClick={this.share}>{gettext('Share')}</DropdownItem>}
                    <DropdownItem className="mobile-menu-item" onClick={this.leaveShare}>{gettext('Leave Share')}</DropdownItem>
                    {enableMonitorRepo && <DropdownItem className="mobile-menu-item" onClick={data.monitored ? this.unwatchFileChanges : this.watchFileChanges}>{data.monitored ? gettext('Unwatch File Changes') : gettext('Watch File Changes')}</DropdownItem>}
                  </div>
                </div>
              </Dropdown>
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
  onMonitorRepo: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func.isRequired,
};

export default Item;
