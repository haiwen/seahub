import React, { Component, Fragment } from 'react';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import OpMenu from '../../../components/dialog/op-menu';
import LinkDialog from '../../../components/dialog/share-admin-link';
import MainPanelTopbar from '../main-panel-topbar';
import Nav from './user-nav';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No shared links')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="5%">{/* icon */}</th>
                <th width="30%">{gettext('Name')}</th>
                <th width="20%">{gettext('Size')}</th>
                <th width="20%">{gettext('Type')}</th>
                <th width="20%">{gettext('Visits')}</th>
                <th width="5%">{/* Operations */}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  isItemFreezed={this.state.isItemFreezed}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                  deleteItem={this.props.deleteItem}
                />);
              })}
            </tbody>
          </table>
        </Fragment>
      );
      return items.length ? table : emptyTip;
    }
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      highlight: false,
      isLinkDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  }

  handleMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  }

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  }

  toggleLinkDialog = () => {
    this.setState({isLinkDialogOpen: !this.state.isLinkDialogOpen});
  }

  deleteItem = () => {
    this.props.deleteItem(this.props.item);
  }

  translateOperations = (item) => {
    let translateResult = '';
    switch (item) {
      case 'View':
        translateResult = gettext('View');
        break;
      case 'Delete':
        translateResult = gettext('Delete');
        break;
    }

    return translateResult;
  }

  onMenuItemClick = (operation) => {
    switch(operation) {
      case 'View':
        this.toggleLinkDialog();
        break;
      case 'Delete':
        this.deleteItem();
        break;
    }
  }

  getRoleText = () => {
    let roleText;
    const { item } = this.props;
    switch(item.role) {
      case 'Owner':
        roleText = gettext('Owner');
        break;
      case 'Admin':
        roleText = gettext('Admin');
        break;
      case 'Member':
        roleText = gettext('Member');
        break;
    }
    return roleText;
  }

  getIconUrl = () => {
    const { item } = this.props;
    let url;
    if (item.type == 'upload') {
      url = Utils.getFolderIconUrl();
    } else { // share link
      if (item.is_dir) {
        url = Utils.getFolderIconUrl();
      } else {
        url = Utils.getFileIconUrl(item.obj_name);
      }
    }
    return url;
  }

  render() {
    const { item } = this.props;
    const { isOpIconShown, isLinkDialogOpen } = this.state;

    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><img src={this.getIconUrl()} alt="" width="24" /></td>
          <td>{item.obj_name == '/' ? item.repo_name : item.obj_name}</td>
          {item.type == 'upload' ?
            <Fragment>
              <td></td>
              <td>{gettext('Upload')}</td>
            </Fragment> :
            <Fragment>
              <td>{item.is_dir ? null : Utils.bytesToSize(item.size)}</td>
              <td>{gettext('Download')}</td>
            </Fragment>
          }
          <td>{item.view_cnt}</td>
          <td>
            {isOpIconShown &&
            <OpMenu
              operations={['View', 'Delete']}
              translateOperations={this.translateOperations}
              onMenuItemClick={this.onMenuItemClick}
              onFreezedItem={this.props.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
            />
            }
          </td>
        </tr>
        {isLinkDialogOpen &&
          <LinkDialog
            link={item.link}
            toggleDialog={this.toggleLinkDialog}
          />
        }
      </Fragment>
    );
  }
}

class Links extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      userInfo: {},
      uploadLinkItems: [],
      shareLinkItems: []
    };
  }

  componentDidMount () {
    const email = decodeURIComponent(this.props.email);
    seafileAPI.sysAdminGetUser(email).then((res) => {
      this.setState({
        userInfo: res.data
      });
    });

    seafileAPI.sysAdminListShareLinksByUser(email).then(res => {
      const items = res.data.share_link_list.map(item => {
        item.type = 'download';
        return item;
      });
      items.sort((a, b) => {
        return a.is_dir ? -1 : 1;
      });
      this.setState({
        loading: false,
        shareLinkItems: items
      });
    });
    seafileAPI.sysAdminListUploadLinksByUser(email).then(res => {
      const items = res.data.upload_link_list.map(item => {
        item.type = 'upload';
        return item;
      });
      this.setState({
        loading: false,
        uploadLinkItems: items
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  deleteItem = (item) => {
    const type = item.type;
    const token = item.token;
    if (type == 'download') {
      seafileAPI.sysAdminDeleteShareLink(token).then(res => {
        let items = this.state.shareLinkItems.filter(item=> {
          return item.token != token;
        });
        this.setState({
          shareLinkItems: items
        });
        toaster.success(gettext('Successfully deleted 1 item.'));
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.sysAdminDeleteUploadLink(token).then(res => {
        let items = this.state.uploadLinkItems.filter(item=> {
          return item.token != token;
        });
        this.setState({
          uploadLinkItems: items
        });
        toaster.success(gettext('Successfully deleted 1 item.'));
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  render() {
    const { shareLinkItems, uploadLinkItems } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <Nav currentItem="links" email={this.props.email} userName={this.state.userInfo.name} />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={[].concat(uploadLinkItems, shareLinkItems)}
                deleteItem={this.deleteItem}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default Links;
