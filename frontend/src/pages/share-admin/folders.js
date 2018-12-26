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
          <h2>{gettext('You have not shared any folders')}</h2>
          <p>{gettext("You can share a single folder with a registered user if you don't want to share a whole library.")}</p>
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
      'p': data.path,
    };
    if (share_type == 'personal') {
      options.share_type = 'user';
      options.username = data.user_email;
    } else if (share_type == 'group') {
      options.share_type = 'group';
      options.group_id = data.group_id;
    }

    seafileAPI.unshareFolder(data.repo_id, options)
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
    const postData = {
      'permission': perm
    };
    let options = {
      'p': data.path,
    };
    if (share_type == 'personal') {
      options.share_type = 'user';
      options.username = data.user_email;
    } else if (share_type == 'group') {
      options.share_type = 'group';
      options.group_id = data.group_id;
    }
    seafileAPI.updateFolderSharePerm(data.repo_id, postData, options).then((res) => {
      this.setState({
        share_permission: perm,
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

    let is_readonly = false;
    if (share_permission == 'r' || share_permission == 'preview') {
      is_readonly = true;
    }
    data.icon_url = Utils.getFolderIconUrl({
      is_readonly: is_readonly, 
      size: Utils.isHiDPI() ? 48 : 24
    }); 
    data.icon_title = Utils.getFolderIconTitle({
      'permission': share_permission
    });
    data.url = `${siteRoot}#my-libs/lib/${data.repo_id}${Utils.encodePath(data.path)}`;

    let shareTo;
    const shareType = data.share_type;
    if (shareType == 'personal') {
      shareTo = <td title={data.contact_email}>{data.user_name}</td>;
    } else if (shareType == 'group') {
      shareTo = <td>{data.group_name}</td>;
    }

    data.cur_perm = share_permission;
    data.cur_perm_text = Utils.sharePerms(data.cur_perm);

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible';
    let unshareIconClassName = 'unshare op-icon sf2-icon-delete' + iconVisibility;

    const item = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={data.icon_url} title={data.icon_title} alt={data.icon_title} width="24" /></td>
        <td><a href={data.url}>{data.folder_name}</a></td>
        {shareTo}
        <td>
          <PermissionEditor 
            isTextMode={true}
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

class ShareAdminFolders extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
    seafileAPI.listSharedFolders().then((res) => {
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
            <h3 className="sf-heading">{gettext("Folders")}</h3>
          </div>
          <div className="cur-view-content">
            <Content data={this.state} />
          </div>
        </div>
      </div>
    );
  }
}

export default ShareAdminFolders;
