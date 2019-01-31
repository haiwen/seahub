import React, { Component } from 'react';
import { Link } from '@reach/router';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, loginUrl, isPro } from '../../utils/constants';
import SharePermissionEditor from '../../components/select-editor/share-permission-editor';
import SharedFolderInfo from '../../models/shared-folder-info';

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
        <div className="empty-tip">
          <h2>{gettext('You have not shared any folders')}</h2>
          <p>{gettext('You can share a single folder with a registered user if you don\'t want to share a whole library.')}</p>
        </div>
      );

      // sort
      const sortByName = sortBy == 'name';
      const sortIcon = sortOrder == 'asc' ? <span className="fas fa-caret-up"></span> : <span className="fas fa-caret-down"></span>;

      const table = (
        <table className="table-hover">
          <thead>
            <tr>
              <th width="4%">{/*icon*/}</th>
              <th width="34%"><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a></th>
              <th width="30%">{gettext('Share To')}</th>
              <th width="24%">{gettext('Permission')}</th>
              <th width="8%"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              return (<Item key={index} item={item} unshareFolder={this.props.unshareFolder}/>);
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
      showOpIcon: false,
      unshared: false
    };

    this.permissions = ['rw', 'r'];
    if (isPro) {
      this.permissions = ['rw', 'r', 'cloud-edit', 'preview'];
    }
  }

  onMouseEnter = () => {
    this.setState({showOpIcon: true});
  }

  onMouseLeave = () => {
    this.setState({showOpIcon: false});
  }

  unshare = (e) => {
    e.preventDefault();
    const item = this.props.item;
    this.props.unshareFolder(item);
  }

  changePerm = (permission) => {
    const perm = permission;
    const postData = {
      'permission': perm
    };
    const item = this.props.item;
    let options = {
      'p': item.path,
      'share_type': item.share_type
    };
    if (item.share_type == 'user') {
      options.username = item.user_email;
    } else {
      options.group_id = item.group_id;
    }

    seafileAPI.updateFolderSharePerm(item.repo_id, postData, options).then((res) => {
      this.setState({share_permission: perm});
      // TODO: show feedback msg
      // gettext("Successfully modified permission")
    }).catch((error) => {
      // TODO: show feedback msg
    });
  }

  getFolderParams = () => {
    let item = this.props.item;
    let share_permission = this.state.share_permission;
    let is_readonly = false;
    if (share_permission == 'r' || share_permission == 'preview') {
      is_readonly = true;
    }
    let iconUrl = Utils.getFolderIconUrl(is_readonly); 
    let iconTitle = Utils.getFolderIconTitle({
      'permission': share_permission
    });
    let folderUrl = `${siteRoot}library/${item.repo_id}/${item.repo_name}${Utils.encodePath(item.path)}`;

    return { iconUrl, iconTitle, folderUrl };
  }

  render() {
    const item = this.props.item;
    let { iconUrl, iconTitle, folderUrl } = this.getFolderParams();

    let shareTo;
    const shareType = item.share_type;
    if (shareType == 'user') {
      shareTo = <td title={item.contact_email}>{item.user_name}</td>;
    } else if (shareType == 'group') {
      shareTo = <td>{item.group_name}</td>;
    }

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let unshareIconClassName = 'unshare action-icon sf2-icon-x3' + iconVisibility;

    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
        <td><Link to={folderUrl}>{item.folder_name}</Link></td>
        {shareTo}
        <td>
          <SharePermissionEditor 
            isTextMode={true}
            isEditIconShow={this.state.showOpIcon}
            currentPermission={this.state.share_permission}
            permissions={this.permissions}
            onPermissionChanged={this.changePerm}
          />
        </td>
        <td><a href="#" className={unshareIconClassName} title={gettext('Unshare')} onClick={this.unshare}></a></td>
      </tr>
    );
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
      // res: {data: Array(2), status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      let items = res.data.map(item => {
        return new SharedFolderInfo(item);
      });
      this.setState({
        loading: false,
        items: this._sortItems(items, this.state.sortBy, this.state.sortOrder)
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

  unshareFolder = (item) => {
    let options = {};
    options['p'] = item.path;
    options.share_type = item.share_type;
    if (item.share_type == 'user') { // or group
      options.username = item.user_email;
    } else {
      options.group_id = item.group_id;
    }

    seafileAPI.unshareFolder(item.repo_id, options).then((res) => {
      let items = this.state.items.filter(folderItem => {
        if (item.share_type === 'user') {
          return folderItem.user_email !== item.user_email;
        } else {
          return folderItem.group_id !== item.group_id;
        }
      });
      this.setState({items: items});
      // TODO: show feedback msg
      // gettext("Successfully deleted 1 item")
    }).catch((error) => {
      // TODO: show feedback msg
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
              unshareFolder={this.unshareFolder}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default ShareAdminFolders;
