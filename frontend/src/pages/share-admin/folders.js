import React, { Fragment, Component } from 'react';
import { Link } from '@gatsbyjs/reach-router';
import { Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, isPro } from '../../utils/constants';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import toaster from '../../components/toast';
import SharePermissionEditor from '../../components/select-editor/share-permission-editor';
import SharedFolderInfo from '../../models/shared-folder-info';
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
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No folders shared')}</h2>
          <p>{gettext('You have not shared any folders with other users yet. You can share a folder with other users by clicking the share icon to the right of a folder\'s name.')}</p>
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
              return (<Item key={index} isDesktop={isDesktop} item={item} />);
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
    this.state = {
      share_permission: this.props.item.share_permission,
      isOpIconShown: false,
      isOpMenuOpen: false, // for mobile
      isPermSelectDialogOpen: false, // for mobile
      unshared: false
    };

    this.permissions = ['rw', 'r'];
    if (isPro) {
      this.permissions.push('cloud-edit', 'preview');
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

  unshare = (e) => {
    e.preventDefault();

    const item = this.props.item;
    let options = {
      'p': item.path
    };
    if (item.share_type == 'personal') {
      Object.assign(options, {
        'share_type': 'user',
        'username': item.user_email
      });
    } else {
      Object.assign(options, {
        'share_type': item.share_type, // 'group'
        'group_id': item.group_id
      });
    }

    seafileAPI.unshareFolder(item.repo_id, options).then((res) => {
      this.setState({
        unshared: true
      });
      let message = gettext('Successfully unshared {name}').replace('{name}', item.folder_name);
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster(errMessage);
    });
  }

  changePerm = (permission) => {
    const item = this.props.item;
    const postData = {
      'permission': permission
    };
    let options = {
      'p': item.path
    };
    if (item.share_type == 'personal') {
      Object.assign(options, {
        'share_type': 'user',
        'username': item.user_email
      });
    } else {
      Object.assign(options, {
        'share_type': item.share_type, // 'group'
        'group_id': item.group_id
      });
    }

    seafileAPI.updateFolderSharePerm(item.repo_id, postData, options).then((res) => {
      this.setState({share_permission: permission});
      toaster.success(gettext('Successfully modified permission.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    if (this.state.unshared) {
      return null;
    }

    const item = this.props.item;
    let { share_permission, isOpIconShown, isPermSelectDialogOpen } = this.state;

    let is_readonly = false;
    if (share_permission == 'r' || share_permission == 'preview') {
      is_readonly = true;
    }
    let iconUrl = Utils.getFolderIconUrl(is_readonly);
    let iconTitle = Utils.getFolderIconTitle({
      'permission': share_permission
    });
    let folderUrl = `${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}${Utils.encodePath(item.path)}`;

    // custom defined permission
    if (share_permission.startsWith('custom-')) {
      share_permission = share_permission.slice(7);
    }
    const desktopItem = (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onFocus={this.onMouseEnter}>
        <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
        <td><Link to={folderUrl}>{item.folder_name}</Link></td>
        <td>
          {item.share_type == 'personal' ?
            <span title={item.contact_email}>{item.user_name}</span> : item.group_name}
        </td>
        <td>
          <SharePermissionEditor
            repoID={item.repo_id}
            isTextMode={true}
            isEditIconShow={isOpIconShown}
            currentPermission={share_permission}
            permissions={this.permissions}
            onPermissionChanged={this.changePerm}
          />
        </td>
        <td><a href="#" role="button" aria-label={gettext('Unshare')} className={`action-icon sf2-icon-x3 ${isOpIconShown ? '': 'invisible'}`} title={gettext('Unshare')} onClick={this.unshare}></a></td>
      </tr>
    );

    const mobileItem = (
      <Fragment>
        <tr>
          <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
          <td>
            <Link to={folderUrl}>{item.folder_name}</Link>
            <span className="item-meta-info-highlighted">{Utils.sharePerms(share_permission)}</span>
            <br />
            <span className="item-meta-info">{`${gettext('Share To:')} ${item.share_type == 'personal' ? item.user_name : item.group_name}`}</span>
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
        {isPermSelectDialogOpen &&(
          <PermSelect
            repoID={item.repo_id}
            currentPerm={share_permission}
            permissions={this.permissions}
            changePerm={this.changePerm}
            toggleDialog={this.togglePermSelectDialog}
          />
        )}
      </Fragment>
    );

    return this.props.isDesktop ? desktopItem : mobileItem;
  }
}

class ShareAdminFolders extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
      sortBy: 'name',
      sortOrder: 'asc' // 'asc' or 'desc'
    };
  }

  _sortItems = (items, sortBy, sortOrder) => {
    let comparator;

    switch (`${sortBy}-${sortOrder}`) {
      case 'name-asc':
        comparator = function(a, b) {
          var result = Utils.compareTwoWord(a.folder_name, b.folder_name);
          return result;
        };
        break;
      case 'name-desc':
        comparator = function(a, b) {
          var result = Utils.compareTwoWord(a.folder_name, b.folder_name);
          return -result;
        };
        break;
    }

    items.sort(comparator);
    return items;
  }

  sortItems = (sortBy, sortOrder) => {
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: this._sortItems(this.state.items, sortBy, sortOrder)
    });
  }

  componentDidMount() {
    seafileAPI.listSharedFolders().then((res) => {
      let items = res.data.map(item => {
        return new SharedFolderInfo(item);
      });
      this.setState({
        loading: false,
        items: this._sortItems(items, this.state.sortBy, this.state.sortOrder)
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container" id="share-admin-libs">
          <div className="cur-view-path">
            <h3 className="sf-heading">{gettext('Folders')}</h3>
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

export default ShareAdminFolders;
