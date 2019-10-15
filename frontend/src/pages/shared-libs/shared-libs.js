import React, { Component, Fragment } from 'react';
import { Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import PropTypes from 'prop-types';
import moment from 'moment';
import cookie from 'react-cookies';
import { Link } from '@reach/router';
import { gettext, siteRoot, loginUrl, isPro } from '../../utils/constants';
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

class Content extends Component {

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  sortBySize = (e) => {
    e.preventDefault();
    const sortBy = 'size';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  render() {
    const { loading, errorMsg, items, sortBy, sortOrder } = this.props;
    
    const emptyTip = (
      <EmptyTip>
        <h2>{gettext('No libraries have been shared with you')}</h2>
        <p>{gettext('No libraries have been shared directly with you. You can find more shared libraries at "Shared with groups".')}</p>
      </EmptyTip>
    );

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      // sort
      const sortByName = sortBy == 'name';
      const sortByTime = sortBy == 'time';
      const sortBySize = sortBy == 'size';
      const sortIcon = sortOrder == 'asc' ? <span className="fas fa-caret-up"></span> : <span className="fas fa-caret-down"></span>;

      const desktopThead = (
        <thead>
          <tr>
            <th width="4%"></th>
            <th width="4%"><span className="sr-only">{gettext('Library Type')}</span></th>
            <th width="34%"><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a></th>
            <th width="10%"><span className="sr-only">{gettext('Actions')}</span></th>
            <th width="14%"><a className="d-block table-sort-op" href="#" onClick={this.sortBySize}>{gettext('Size')} {sortBySize && sortIcon}</a></th>
            <th width="18%"><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {sortByTime && sortIcon}</a></th>
            <th width="16%">{gettext('Owner')}</th>
          </tr>
        </thead>
      );

      const isDesktop = Utils.isDesktop();
      const table = (
        <table className={isDesktop ? '' : 'table-thead-hidden'}>
          {isDesktop ? desktopThead : <LibsMobileThead />}
          <tbody>
            {items.map((item, index) => {
              return <Item key={index} data={item} isDesktop={isDesktop} />;
            })}
          </tbody>
        </table>
      );

      return items.length ? table : emptyTip; 
    }
  }
}

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showOpIcon: false,
      unshared: false,
      isShowSharedDialog: false,
      isStarred: this.props.data.starred,
      isOpMenuOpen: false // for mobile
    };
  }

  toggleOpMenu = () => {
    this.setState({
      isOpMenuOpen: !this.state.isOpMenuOpen
    });
  }

  handleMouseOver = () => {
    this.setState({
      showOpIcon: true
    });
  }

  handleMouseOut = () => {
    this.setState({
      showOpIcon: false
    });
  }

  share = (e) => {
    e.preventDefault();
    this.setState({isShowSharedDialog: true});
  }

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
      this.setState({unshared: true});
      let message = gettext('Successfully unshared {name}').replace('{name}', data.repo_name);
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        errMessage = gettext('Failed to unshare {name}').replace('{name}', data.repo_name);
      }
      toaster(errMessage);
    });
  }

  toggleShareDialog = () => {
    this.setState({isShowSharedDialog: false});
  }

  onStarRepo = () => {
    const repoName = this.props.data.repo_name;
    if (this.state.isStarred) {
      seafileAPI.unstarItem(this.props.data.repo_id, '/').then(() => {
        this.setState({isStarred: !this.state.isStarred});
        const msg = gettext('Successfully unstarred {library_name_placeholder}.')
          .replace('{library_name_placeholder}', repoName);
        toaster.success(msg);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.starItem(this.props.data.repo_id, '/').then(() => {
        this.setState({isStarred: !this.state.isStarred});
        const msg = gettext('Successfully starred {library_name_placeholder}.')
          .replace('{library_name_placeholder}', repoName);
        toaster.success(msg);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  render() {
    if (this.state.unshared) {
      return null;
    }

    const data = this.props.data;

    data.icon_url = Utils.getLibIconUrl(data); 
    data.icon_title = Utils.getLibIconTitle(data);
    data.url = `${siteRoot}#shared-libs/lib/${data.repo_id}/`;

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let shareIconClassName = 'op-icon sf2-icon-share repo-share-btn' + iconVisibility; 
    let leaveShareIconClassName = 'op-icon sf2-icon-x3' + iconVisibility;
    let shareRepoUrl =`${siteRoot}library/${data.repo_id}/${Utils.encodePath(data.repo_name)}/`;
    const desktopItem = (
      <Fragment>
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td className="text-center">
            {!this.state.isStarred && <i className="far fa-star star-empty cursor-pointer" onClick={this.onStarRepo}></i>}
            {this.state.isStarred && <i className="fas fa-star cursor-pointer" onClick={this.onStarRepo}></i>}
          </td>
          <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
          <td><Link to={shareRepoUrl}>{data.repo_name}</Link></td>
          <td>
            {(isPro && data.is_admin) &&
              <a href="#" className={shareIconClassName} title={gettext('Share')} onClick={this.share}></a>
            }
            <a href="#" className={leaveShareIconClassName} title={gettext('Leave Share')} onClick={this.leaveShare}></a>
          </td>
          <td>{data.size}</td>
          <td title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</td>
          <td title={data.owner_contact_email}>{data.owner_name}</td>
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

    const mobileItem = (
      <Fragment>
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
          <td>
            <Link to={shareRepoUrl}>{data.repo_name}</Link><br />
            <span className="item-meta-info" title={data.owner_contact_email}>{data.owner_name}</span>
            <span className="item-meta-info">{data.size}</span>
            <span className="item-meta-info" title={moment(data.last_modified).format('llll')}>{moment(data.last_modified).fromNow()}</span>
          </td>
          <td>
            <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
              <DropdownToggle
                tag="i"
                className="sf-dropdown-toggle fa fa-ellipsis-v ml-0"
                title={gettext('More Operations')}
                data-toggle="dropdown"
                aria-expanded={this.state.isOpMenuOpen}
              />
              <div className={this.state.isOpMenuOpen ? '' : 'd-none'} onClick={this.toggleOpMenu}>
                <div className="mobile-operation-menu-bg-layer"></div>
                <div className="mobile-operation-menu">
                  <DropdownItem className="mobile-menu-item" onClick={this.onStarRepo}>{this.state.isStarred ? gettext('Unstar') : gettext('Star')}</DropdownItem>
                  {(isPro && data.is_admin) &&
                  <DropdownItem className="mobile-menu-item" onClick={this.share}>{gettext('Share')}</DropdownItem>
                  }
                  <DropdownItem className="mobile-menu-item" onClick={this.leaveShare}>{gettext('Leave Share')}</DropdownItem>
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

    return this.props.isDesktop ? desktopItem : mobileItem;
  }
}

Item.propTypes = {
  isDesktop: PropTypes.bool.isRequired,
  data: PropTypes.object.isRequired
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
    seafileAPI.listRepos({type:'shared'}).then((res) => {
      let repoList = res.data.repos.map((item) => {
        return new Repo(item);
      });
      this.setState({
        loading: false,
        items: Utils.sortRepos(repoList, this.state.sortBy, this.state.sortOrder)
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          });
        }

      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  sortItems = (sortBy, sortOrder) => {
    cookie.save('seafile-repo-dir-sort-by', sortBy);
    cookie.save('seafile-repo-dir-sort-order', sortOrder);
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: Utils.sortRepos(this.state.items, sortBy, sortOrder)
    });
  }

  toggleSortOptionsDialog = () => {
    this.setState({
      isSortOptionsDialogOpen: !this.state.isSortOptionsDialogOpen
    });
  }

  render() {
    return (
      <Fragment>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading m-0">{gettext('Shared with me')}</h3>
              {(!Utils.isDesktop() && this.state.items.length > 0) && <span className="sf3-font sf3-font-sort action-icon" onClick={this.toggleSortOptionsDialog}></span>}
            </div>
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.items}
                sortBy={this.state.sortBy}
                sortOrder={this.state.sortOrder}
                sortItems={this.sortItems}
              />
            </div>
          </div>
        </div>
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

export default SharedLibraries;
