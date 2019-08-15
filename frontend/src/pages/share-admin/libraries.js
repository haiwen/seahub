import React, { Fragment, Component } from 'react';
import { Link } from '@reach/router';
import { Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot, loginUrl, isPro } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import EmptyTip from '../../components/empty-tip';
import SharePermissionEditor from '../../components/select-editor/share-permission-editor';
import SharedRepoInfo from '../../models/shared-repo-info';
import PermSelect from '../../components/dialog/perm-select';

class Content extends Component {

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  render() {
    const { loading, errorMsg, items, sortBy, sortOrder } = this.props;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('You have not shared any libraries')}</h2>
          <p>{gettext('You can share libraries with your friends and colleagues by clicking the share icon of your own libraries in your home page or creating a new library in groups you are in.')}</p>
        </EmptyTip>
      );

      // sort
      const sortByName = sortBy == 'name';
      const sortIcon = sortOrder == 'asc' ? <span className="fas fa-caret-up"></span> : <span className="fas fa-caret-down"></span>;

      const isDesktop = Utils.isDesktop();
      const table = (
        <table className={`table-hover ${isDesktop ? '': 'table-thead-hidden'}`}>
          <thead>
            {isDesktop ? (
              <tr>
                <th width="4%">{/*icon*/}</th>
                <th width="34%"><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a></th>
                <th width="30%">{gettext('Share To')}</th>
                <th width="24%">{gettext('Permission')}</th>
                <th width="8%"></th>
              </tr>
            ) : (
              <tr>
                <th width="12%"></th>
                <th width="80%"></th>
                <th width="8%"></th>
              </tr>
            )}
          </thead>
          <tbody>
            {items.map((item, index) => {
              return (<Item 
                key={index}
                isDesktop={isDesktop}
                item={item}
              />);
            })}
          </tbody>
        </table>
      );

      return items.length ? table : emptyTip; 
    }
  }
}

class Item extends Component {

  constructor(props) {
    super(props);

    let item = this.props.item;
    this.state = {
      share_permission: item.share_permission,
      is_admin: item.is_admin,
      isOpIconShown: false,
      isOpMenuOpen: false, // for mobile
      isPermSelectDialogOpen: false, // for mobile
      unshared: false
    };
    let permissions = ['rw', 'r'];
    this.permissions = permissions;
    this.showAdmin = isPro && (item.share_type !== 'public');
    if (this.showAdmin) {
      permissions.push('admin');
    }
    if (isPro) {
      permissions.push('cloud-edit', 'preview');
    }
  }

  toggleOpMenu = () => {
    this.setState({
      isOpMenuOpen: !this.state.isOpMenuOpen
    });
  }

  togglePermSelectDialog = () => {
    this.setState({
      isPermSelectDialogOpen: !this.state.isPermSelectDialogOpen
    });
  }

  onMouseEnter = () => {
    this.setState({isOpIconShown: true});
  }

  onMouseLeave = () => {
    this.setState({isOpIconShown: false});
  }

  changePerm = (permission) => {
    const item = this.props.item;
    const share_type = item.share_type;
    let options = {
      'share_type': share_type,
      'permission': permission
    };
    if (share_type == 'personal') {
      options.user = item.user_email;
    } else if (share_type == 'group') {
      options.group_id = item.group_id;
    }

    seafileAPI.updateRepoSharePerm(item.repo_id, options).then(() => {
      this.setState({
        share_permission: permission == 'admin' ? 'rw' : permission,
        is_admin: permission == 'admin',
      });
      toaster.success(gettext('Successfully modified permission.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  unshare = (e) => {
    e.preventDefault();

    const item = this.props.item;
    const share_type = item.share_type;
    let options = {
      'share_type': share_type
    };
    if (share_type == 'personal') {
      options.user = item.user_email;
    } else if (share_type == 'group') {
      options.group_id = item.group_id;
    } 

    seafileAPI.unshareRepo(item.repo_id, options).then((res) => {
      this.setState({
        unshared: true
      });
      let message = gettext('Successfully unshared {name}').replace('{name}', item.repo_name);
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster(errMessage);
    });
  }

  render() {
    if (this.state.unshared) {
      return null;
    }

    let { share_permission, is_admin, isOpIconShown, isPermSelectDialogOpen } = this.state;
    let item = this.props.item;
    Object.assign(item, {
      share_permission: share_permission,
      is_admin: is_admin
    });

    let iconUrl = Utils.getLibIconUrl(item); 
    let iconTitle = Utils.getLibIconTitle(item);
    let repoUrl = `${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}/`;


    let shareTo;
    const shareType = item.share_type;
    if (shareType == 'personal') {
      shareTo = item.user_name;
    } else if (shareType == 'group') {
      shareTo = item.group_name;
    } else if (shareType == 'public') {
      shareTo = gettext('all members');
    }

    if (this.showAdmin && is_admin) {
      share_permission = 'admin';
    }

    const desktopItem = (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
        <td><Link to={repoUrl}>{item.repo_name}</Link></td>
        <td>
          {item.share_type == 'personal' ? <span title={item.contact_email}>{shareTo}</span> : shareTo}
        </td>
        <td>
          <SharePermissionEditor 
            isTextMode={true}
            isEditIconShow={this.state.isOpIconShown}
            currentPermission={share_permission}
            permissions={this.permissions}
            onPermissionChanged={this.changePerm}
          />
        </td>
        <td><a href="#" className={`action-icon sf2-icon-x3 ${isOpIconShown ? '': 'invisible'}`} title={gettext('Unshare')} onClick={this.unshare}></a></td>
      </tr>
    );

    const mobileItem = (
      <Fragment>
        <tr>
          <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
          <td>
            <Link to={repoUrl}>{item.repo_name}</Link>
            <span className="item-meta-info-highlighted">{Utils.sharePerms(share_permission)}</span>
            <br />
            <span className="item-meta-info">{`${gettext('Share To:')} ${shareTo}`}</span>
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
                  <DropdownItem className="mobile-menu-item" onClick={this.togglePermSelectDialog}>{gettext('Permission')}</DropdownItem>
                  <DropdownItem className="mobile-menu-item" onClick={this.unshare}>{gettext('Unshare')}</DropdownItem>
                </div>
              </div>
            </Dropdown>
          </td>
        </tr>
        {isPermSelectDialogOpen &&
        <PermSelect
          currentPerm={share_permission}
          permissions={this.permissions}
          changePerm={this.changePerm}
          toggleDialog={this.togglePermSelectDialog}
        />
        }
      </Fragment>
    );

    return this.props.isDesktop ? desktopItem : mobileItem;
  }
}

class ShareAdminLibraries extends Component {
  
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
      sortBy: 'name', // 'name' or 'time'
      sortOrder: 'asc' // 'asc' or 'desc'
    };
  }

  componentDidMount() {
    seafileAPI.listSharedRepos().then((res) => {
      // res: {data: Array(2), status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      let items = res.data.map(item => {
        return new SharedRepoInfo(item);
      });
      this.setState({
        loading: false,
        items: Utils.sortRepos(items, this.state.sortBy, this.state.sortOrder)
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
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: Utils.sortRepos(this.state.items, sortBy, sortOrder)
    });
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container" id="share-admin-libs">
          <div className="cur-view-path">
            <h3 className="sf-heading">{gettext('Libraries')}</h3>
          </div>
          <div className="cur-view-content">
            <Content 
              errorMsg={this.state.errorMsg}
              loading={this.state.loading}
              items={this.state.items}
              sortBy={this.state.sortBy}
              sortOrder={this.state.sortOrder}
              sortItems={this.sortItems}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default ShareAdminLibraries;
