import React, { Component, Fragment } from 'react';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import PropTypes from 'prop-types';
import moment from 'moment';
import cookie from 'react-cookies';
import { Link, navigate } from '@gatsbyjs/reach-router';
import { gettext, siteRoot, isPro } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Repo from '../../models/repo';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import LibsMobileThead from '../../components/libs-mobile-thead';
import ModalPotal from '../../components/modal-portal';
import ShareDialog from '../../components/dialog/share-dialog';
import SortOptionsDialog from '../../components/dialog/sort-options';
import RepoMonitoredIcon from '../../components/repo-monitored-icon';
import { GRID_MODE, LIST_MODE } from '../../components/dir-view-mode/constants';
import ContextMenu from '../../components/context-menu/context-menu';
import { hideMenu, handleContextClick } from '../../components/context-menu/actions';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
    this.libItems = [];
  }

  freezeItem = (freezed) => {
    this.setState({
      isItemFreezed: freezed
    });
  };

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  sortBySize = (e) => {
    e.preventDefault();
    const sortBy = 'size';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  onContextMenu = (event, repo) => {
    event.preventDefault();
    const id = 'shared-libs-item-menu';
    const menuList = Utils.getSharedLibsOperationList(repo);
    handleContextClick(event, id, menuList, repo);
  };

  setLibItemRef = (index) => item => {
    this.libItems[index] = item;
  };

  getLibIndex = (lib) => {
    return this.props.items.findIndex(item => {
      return item.repo_id === lib.repo_id;
    });
  };

  onMenuItemClick = (operation, currentObject, event) => {
    const index = this.getLibIndex(currentObject);
    this.libItems[index].onMenuItemClick(operation, event);

    hideMenu();
  };

  render() {
    const { loading, errorMsg, items, sortBy, sortOrder, theadHidden, inAllLibs, currentViewMode } = this.props;

    const emptyTip = inAllLibs ?
      <p className={`libraries-empty-tip-in-${currentViewMode}-mode`}>{gettext('No shared libraries')}</p> :
      <EmptyTip
        title={gettext('No shared libraries')}
        text={gettext('No libraries have been shared directly with you. A shared library can be shared with full or restricted permission. If you need access to a library owned by another user, ask the user to share the library with you.')}
      >
      </EmptyTip>;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      // sort
      const sortByName = sortBy == 'name';
      const sortByTime = sortBy == 'time';
      const sortBySize = sortBy == 'size';
      const sortIcon = sortOrder == 'asc' ? <span className="sf3-font sf3-font-down rotate-180 d-inline-block"></span> : <span className="sf3-font sf3-font-down"></span>;

      const desktopThead = (
        <thead>
          <tr>
            <th width="4%"></th>
            <th width="3%"><span className="sr-only">{gettext('Library Type')}</span></th>
            <th width="35%"><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a></th>
            <th width="10%"><span className="sr-only">{gettext('Actions')}</span></th>
            <th width="14%"><a className="d-block table-sort-op" href="#" onClick={this.sortBySize}>{gettext('Size')} {sortBySize && sortIcon}</a></th>
            <th width="17%"><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {sortByTime && sortIcon}</a></th>
            <th width="17%">{gettext('Owner')}</th>
          </tr>
        </thead>
      );

      const isDesktop = Utils.isDesktop();
      const itemsContent = (
        <>
          {items.map((item, index) => {
            return <Item
              ref={this.setLibItemRef(index)}
              key={index}
              data={item}
              isDesktop={isDesktop}
              isItemFreezed={this.state.isItemFreezed}
              freezeItem={this.freezeItem}
              onMonitorRepo={this.props.onMonitorRepo}
              currentViewMode={currentViewMode}
              onContextMenu={this.onContextMenu}
            />;
          })}
        </>
      );
      const content = currentViewMode == LIST_MODE ? (
        <>
          <table className={(isDesktop && !theadHidden) ? '' : 'table-thead-hidden'}>
            {isDesktop ? desktopThead : <LibsMobileThead inAllLibs={inAllLibs} />}
            <tbody>
              {itemsContent}
            </tbody>
          </table>
        </>
      ) : (
        <div className="d-flex justify-content-between flex-wrap">
          {itemsContent}
        </div>
      );

      return items.length ? (
        <>
          {content}
          <ContextMenu
            id="shared-libs-item-menu"
            onMenuItemClick={this.onMenuItemClick}
          />
        </>
      ) : emptyTip;
    }
  }
}

Content.propTypes = {
  currentViewMode: PropTypes.string,
  inAllLibs: PropTypes.bool.isRequired,
  theadHidden: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  onMonitorRepo: PropTypes.func.isRequired
};

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

  onToggleStarRepo = (e) => {
    e.preventDefault();
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
    const useBigLibaryIcon = currentViewMode == GRID_MODE;
    data.icon_url = Utils.getLibIconUrl(data, useBigLibaryIcon);
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
              <td title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</td>
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
            <ModalPotal>
              <ShareDialog
                itemType={'library'}
                itemName={data.repo_name}
                itemPath={'/'}
                repoID={data.repo_id}
                repoEncrypted={data.encrypted}
                enableDirPrivateShare={true}
                userPerm={data.permission}
                isAdmin={true}
                toggleDialog={this.toggleShareDialog}
              />
            </ModalPotal>
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
              <span className="item-meta-info" title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</span>
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
            <ModalPotal>
              <ShareDialog
                itemType={'library'}
                itemName={data.repo_name}
                itemPath={'/'}
                repoID={data.repo_id}
                repoEncrypted={data.encrypted}
                enableDirPrivateShare={true}
                userPerm={data.permission}
                isAdmin={true}
                toggleDialog={this.toggleShareDialog}
              />
            </ModalPotal>
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

class SharedLibraries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
      sortBy: cookie.load('seafile-repo-dir-sort-by') || 'name', // 'name' or 'time' or 'size'
      sortOrder: cookie.load('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'
      isSortOptionsDialogOpen: false
    };
  }

  componentDidMount() {
    if (!this.props.repoList) {
      seafileAPI.listRepos({ type: 'shared' }).then((res) => {
        let repoList = res.data.repos.map((item) => {
          return new Repo(item);
        });
        this.setState({
          loading: false,
          items: Utils.sortRepos(repoList, this.state.sortBy, this.state.sortOrder)
        });
      }).catch((error) => {
        this.setState({
          loading: false,
          errorMsg: Utils.getErrorMsg(error, true)
        });
      });
    } else {
      this.setState({
        loading: false,
        items: this.props.repoList
      });
    }
  }

  sortItems = (sortBy, sortOrder) => {
    cookie.save('seafile-repo-dir-sort-by', sortBy);
    cookie.save('seafile-repo-dir-sort-order', sortOrder);
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: Utils.sortRepos(this.state.items, sortBy, sortOrder)
    });
  };

  toggleSortOptionsDialog = () => {
    this.setState({
      isSortOptionsDialogOpen: !this.state.isSortOptionsDialogOpen
    });
  };

  onMonitorRepo = (repo, monitored) => {
    let items = this.state.items.map(item => {
      if (item.repo_id === repo.repo_id) {
        item.monitored = monitored;
      }
      return item;
    });
    this.setState({ items: items });
  };

  renderContent = () => {
    const { inAllLibs = false, currentViewMode = LIST_MODE, repoList } = this.props; // inAllLibs: in 'All Libs'('Files') page
    const { items } = this.state;
    return (
      <Content
        loading={this.state.loading}
        errorMsg={this.state.errorMsg}
        items={inAllLibs ? repoList : items}
        sortBy={this.state.sortBy}
        sortOrder={this.state.sortOrder}
        sortItems={this.sortItems}
        onMonitorRepo={this.onMonitorRepo}
        theadHidden={inAllLibs}
        inAllLibs={inAllLibs}
        currentViewMode={currentViewMode}
      />
    );
  };

  renderSortIconInMobile = () => {
    return (
      <>
        {(!Utils.isDesktop() && this.state.items.length > 0) && <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>}
      </>
    );
  };

  render() {
    const { inAllLibs = false, currentViewMode = LIST_MODE } = this.props; // inAllLibs: in 'All Libs'('Files') page
    return (
      <Fragment>
        {inAllLibs ? (
          <>
            <div className={`d-flex justify-content-between mt-3 py-1 ${currentViewMode == LIST_MODE ? 'sf-border-bottom' : ''}`}>
              <h4 className="sf-heading m-0">
                <span className="sf3-font-share-with-me sf3-font nav-icon" aria-hidden="true"></span>
                {gettext('Shared with me')}
              </h4>
              {this.renderSortIconInMobile()}
            </div>
            {this.renderContent()}
          </>
        ) : (
          <div className="main-panel-center">
            <div className="cur-view-container">
              <div className="cur-view-path">
                <h3 className="sf-heading m-0">{gettext('Shared with me')}</h3>
                {this.renderSortIconInMobile()}
              </div>
              <div className="cur-view-content">
                {this.renderContent()}
              </div>
            </div>
          </div>
        )}
        {this.state.isSortOptionsDialogOpen &&
        <SortOptionsDialog
          toggleDialog={this.toggleSortOptionsDialog}
          sortBy={this.state.sortBy}
          sortOrder={this.state.sortOrder}
          sortItems={this.sortItems}
        />
        }
      </Fragment>
    );
  }
}

SharedLibraries.propTypes = {
  currentViewMode: PropTypes.string,
  inAllLibs: PropTypes.bool,
  repoList: PropTypes.array,
};

export default SharedLibraries;
