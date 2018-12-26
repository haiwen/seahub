import React, { Component } from 'react';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, loginUrl, isPro } from '../../utils/constants';
import PermissionEditor from '../../components/permission-editor';

class Content extends Component {

  render() {
    const {loading, errorMsg, items} = this.props.data;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <div className="empty-tip">
          <h2>{gettext('You have not shared any libraries')}</h2>
          <p>{gettext("You can share libraries with your friends and colleagues by clicking the share icon of your own libraries in your home page or creating a new library in groups you are in.")}</p>
        </div>
      );

      const table = (
        <table className="table-hover">
          <thead>
            <tr>
              <th width="4%">{/*icon*/}</th>
              <th width="34%">{gettext("Name")} <a className="table-sort-op by-name" href="#"><span className="sort-icon icon-caret-down hide"></span>{/* TODO: sort by name */}</a></th>
              <th width="30%">{gettext("Share To")}</th>
              <th width="24%">{gettext("Permission")}</th>
              <th width="8%"></th>
            </tr>
          </thead>
          <TableBody items={items} />
        </table>
      );

      return items.length ? table : emptyTip; 
    }
  }
}

class TableBody extends Component {

  constructor(props) {
    super(props);
    this.state = {
      items: this.props.items
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.clickDocument);
  }

  clickDocument(e) {
    // TODO: click 'outside' to hide `<select>`
  }

  render() {

    let listItems = this.state.items.map(function(item, index) {
      return <Item key={index} data={item} />;
    }, this);

    return (
      <tbody>{listItems}</tbody>
    );
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      share_permission: this.props.data.share_permission,
      is_admin: this.props.data.is_admin,
      showOpIcon: false,
      showSelect: false,
      unshared: false
    };

    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);

    this.showSelect = this.showSelect.bind(this);
    this.changePerm = this.changePerm.bind(this);
    this.unshare = this.unshare.bind(this);

    this.permissions = ['rw', 'r'];
    if (isPro) {
      this.permissions = ['rw', 'r', 'cloud-edit', 'preview'];
    }
  }

  handleMouseOver() {
    this.setState({
      showOpIcon: true
    });
  }

  handleMouseOut() {
    this.setState({
      showOpIcon: false
    });
  }

  unshare(e) {
    e.preventDefault();

    const data = this.props.data;
    const share_type = data.share_type;
    let options = {
      'share_type': share_type
    };
    if (share_type == 'personal') {
      options.user = data.user_email;
    } else if (share_type == 'group') {
      options.group_id = data.group_id;
    } 

    seafileAPI.unshareRepo(data.repo_id, options)
      .then((res) => {
        this.setState({
          unshared: true
        });
        // TODO: show feedback msg
        // gettext("Successfully deleted 1 item")
      })
      .catch((error) => {
      // TODO: show feedback msg
      });
  }

  showSelect(e) {
    e.preventDefault();
    this.setState({
      showSelect: true
    });
  }

  changePerm(permission) {
    const data = this.props.data;
    const share_type = data.share_type;
    const perm = permission;
    let options = {
      'share_type': share_type,
      'permission': perm
    };
    if (share_type == 'personal') {
      options.user = data.user_email;
    } else if (share_type == 'group') {
      options.group_id = data.group_id;
    }  
    seafileAPI.updateRepoSharePerm(data.repo_id, options).then((res) => {
      this.setState({
        share_permission: perm == 'admin' ? 'rw' : perm,
        is_admin: perm == 'admin',
        showSelect: false
      });
      // TODO: show feedback msg
      // gettext("Successfully modified permission")
    }).catch((error) => {
      // TODO: show feedback msg
    });
  }

  render() {

    if (this.state.unshared) {
      return null;
    }

    const data = this.props.data;

    const share_permission = this.state.share_permission;
    const is_admin = this.state.is_admin;

    let is_readonly = false;
    if (share_permission == 'r' || share_permission == 'preview') {
      is_readonly = true;
    }
    data.icon_url = Utils.getLibIconUrl({
      is_encrypted: data.encrypted,
      is_readonly: is_readonly, 
      size: Utils.isHiDPI() ? 48 : 24
    }); 
    data.icon_title = Utils.getLibIconTitle({
      'encrypted': data.encrypted,
      'is_admin': is_admin,
      'permission': share_permission
    });
    data.url = `${siteRoot}#my-libs/lib/${data.repo_id}/`;

    let shareTo;
    const shareType = data.share_type;
    if (shareType == 'personal') {
      shareTo = <td title={data.contact_email}>{data.user_name}</td>;
    } else if (shareType == 'group') {
      shareTo = <td>{data.group_name}</td>;
    } else if (shareType == 'public') {
      shareTo = <td>{gettext('all members')}</td>;
    }

    data.cur_perm = share_permission;
    // show 'admin' perm or not
    data.show_admin = isPro && data.share_type != 'public'; 
    if (data.show_admin && is_admin) {
      data.cur_perm = 'admin';
    }
    data.cur_perm_text = Utils.sharePerms(data.cur_perm);

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let unshareIconClassName = 'unshare op-icon sf2-icon-x3' + iconVisibility;

    if (data.show_admin && this.permissions.indexOf('admin') === -1) {
      this.permissions.splice(2, 0, 'admin'); // add a item after 'r' permission;
    }

    const item = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
        <td><a href={data.url}>{data.repo_name}</a></td>
        {shareTo}
        <td>
          <PermissionEditor 
            isTextMode={true}
            isEditIconShow={this.state.showOpIcon}
            currentPermission={data.cur_perm}
            permissions={this.permissions}
            onPermissionChangedHandler={this.changePerm}
          />
        </td>
        <td><a href="#" className={unshareIconClassName} title={gettext('Unshare')} onClick={this.unshare}></a></td>
      </tr>
    );

    return item;
  }
}

class ShareAdminLibraries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
    seafileAPI.listSharedRepos().then((res) => {
      // res: {data: Array(2), status: 200, statusText: "OK", headers: {…}, config: {…}, …}
      this.setState({
        loading: false,
        items: res.data
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext("Permission denied")
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext("Error")
          });
        }

      } else {
        this.setState({
          loading: false,
          errorMsg: gettext("Please check the network.")
        });
      }
    });
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container" id="share-admin-libs">
          <div className="cur-view-path">
            <h3 className="sf-heading">{gettext("Libraries")}</h3>
          </div>
          <div className="cur-view-content">
            <Content data={this.state} />
          </div>
        </div>
      </div>
    );
  }
}

export default ShareAdminLibraries;
