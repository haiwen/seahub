import React, { Component } from 'react';
import { Link } from '@reach/router';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, loginUrl, isPro } from '../../utils/constants';
import SharePermissionEditor from '../../components/select-editor/share-permission-editor';
import SharedRepoInfo from '../../models/shared-repo-info';

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
          <h2>{gettext('You have not shared any libraries')}</h2>
          <p>{gettext('You can share libraries with your friends and colleagues by clicking the share icon of your own libraries in your home page or creating a new library in groups you are in.')}</p>
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

    let item = this.props.item;
    this.state = {
      share_permission: item.share_permission,
      is_admin: item.is_admin,
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
    } else if (share_type === 'public') {
      // nothing todo
    }

    seafileAPI.updateRepoSharePerm(item.repo_id, options).then(() => {
      this.setState({
        share_permission: permission == 'admin' ? 'rw' : permission,
        is_admin: permission == 'admin',
      });
      // TODO: show feedback msg
      // gettext("Successfully modified permission")
    }).catch((error) => {
      // TODO: show feedback msg
    });
  }

  unshare = () => {
    this.props.unshareFolder(this.props.item);
  }

  getRepoParams = () => {
    let item = this.props.item;
    
    let iconUrl = Utils.getLibIconUrl(item); 
    let iconTitle = Utils.getLibIconTitle(item);
    let repoUrl = `${siteRoot}library/${item.repo_id}/${item.repo_name}`;

    return { iconUrl, iconTitle, repoUrl };
  }

  render() {

    let { iconUrl, iconTitle, repoUrl } = this.getRepoParams();
    let item = this.props.item;
    let { share_permission, is_admin } = this.state;

    let shareTo;
    const shareType = item.share_type;
    if (shareType == 'personal') {
      shareTo = <td title={item.contact_email}>{item.user_name}</td>;
    } else if (shareType == 'group') {
      shareTo = <td>{item.group_name}</td>;
    } else if (shareType == 'public') {
      shareTo = <td>{gettext('all members')}</td>;
    }

    // show 'admin' perm or not
    let showAdmin = isPro && (item.share_type !== 'public'); 
    if (showAdmin && is_admin) {
      share_permission = 'admin';
    }

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let unshareIconClassName = 'unshare action-icon sf2-icon-x3' + iconVisibility;

    if (showAdmin && this.permissions.indexOf('admin') === -1) {
      this.permissions.splice(2, 0, 'admin'); // add a item after 'r' permission;
    }

    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
        <td><Link to={repoUrl}>{item.repo_name}</Link></td>
        {shareTo}
        <td>
          <SharePermissionEditor 
            isTextMode={true}
            isEditIconShow={this.state.showOpIcon}
            currentPermission={share_permission}
            permissions={this.permissions}
            onPermissionChanged={this.changePerm}
          />
        </td>
        <td><a href="#" className={unshareIconClassName} title={gettext('Unshare')} onClick={this.unshare}></a></td>
      </tr>
    );
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

  unshareFolder = (item) => {
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
      let items = [];
      if (item.share_type === 'personal') {
        items = this.state.items.filter(repoItem => {
          return !(repoItem.user_email === item.user_email && repoItem.repo_id === item.repo_id);
        });
      } else if (item.share_type === 'group') {
        items = this.state.items.filter(repoItem => {
          return !(repoItem.group_id === item.group_id && repoItem.repo_id === item.repo_id);
        });
      } else if (item.share_type === 'public') {
        items = this.state.items.filter(repoItem => {
          return !(repoItem.share_type === 'public' && repoItem.repo_id === item.repo_id);
        });
      }
      this.setState({items: items});
      // TODO: show feedback msg
      // gettext("Successfully deleted 1 item")
    }).catch((error) => {
    // TODO: show feedback msg
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
              unshareFolder={this.unshareFolder}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default ShareAdminLibraries;
