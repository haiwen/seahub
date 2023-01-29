import React, { Component, Fragment } from 'react';
import moment from 'moment';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import OpMenu from '../../../components/dialog/op-menu';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import UserLink from '../user-link';
import MainPanelTopbar from '../main-panel-topbar';
import InstitutionNav from './institution-nav';

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
          <h2>{gettext('No admins')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="25%">{gettext('Name')}</th>
                <th width="10%">{gettext('Status')}</th>
                <th width="20%">{gettext('Space Used')}</th>
                <th width="40%">{gettext('Created At')}{' / '}{gettext('Last Login')}</th>
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
                  revokeAdmin={this.props.revokeAdmin}
                  deleteUser={this.props.deleteUser}
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
      isRevokeAdminDialogOpen: false,
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

  toggleRevokeAdminDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isRevokeAdminDialogOpen: !this.state.isRevokeAdminDialogOpen});
  }

  revokeAdmin = () => {
    this.props.revokeAdmin(this.props.item);
  }

  onMenuItemClick = (operation) => {
    switch (operation) {
      case 'Revoke Admin':
        this.toggleRevokeAdminDialog();
        break;
    }
  }

  translateOperations = (item) => {
    let translateResult = '';
    switch(item) {
      case 'Revoke Admin':
        translateResult = gettext('Revoke Admin');
        break;
    }
    return translateResult;
  }

  render() {
    const { item } = this.props;
    const { isOpIconShown, isRevokeAdminDialogOpen } = this.state;

    const itemName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    const revokeAdminDialogMsg = gettext('Are you sure you want to revoke the admin permission of {placeholder} ?').replace('{placeholder}', itemName);

    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td>
            <UserLink email={item.email} name={item.name} />
          </td>
          <td>
            {item.is_active ? gettext('Active') : gettext('Inactive')}
          </td>
          <td>{`${Utils.bytesToSize(item.quota_usage)} / ${item.quota_total > 0 ? Utils.bytesToSize(item.quota_total) : '--'}`}</td>
          <td>
            {moment(item.create_time).format('YYYY-MM-DD HH:mm:ss')}{' / '}{item.last_login ? moment(item.last_login).fromNow() : '--'}
          </td>
          <td>
            {isOpIconShown &&
            <OpMenu
              operations={['Revoke Admin']}
              translateOperations={this.translateOperations}
              onMenuItemClick={this.onMenuItemClick}
              onFreezedItem={this.props.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
            />
            }
          </td>
        </tr>
        {isRevokeAdminDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Revoke Admin')}
            message={revokeAdminDialogMsg}
            executeOperation={this.revokeAdmin}
            confirmBtnText={gettext('Revoke')}
            toggleDialog={this.toggleRevokeAdminDialog}
          />
        }
      </Fragment>
    );
  }
}

class InstitutionAdmins extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      institutionName: '',
      userList: [],
      isAddUserDialogOpen: false
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminGetInstitution(this.props.institutionID).then((res) => {
      this.setState({
        institutionName: res.data.name
      });
    });
    seafileAPI.sysAdminListInstitutionAdmins(this.props.institutionID).then((res) => {
      this.setState({
        loading: false,
        userList: res.data.user_list,
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  revokeAdmin = (item) => {
    const email = item.email;
    const name = item.name;
    seafileAPI.sysAdminUpdateInstitutionUser(this.props.institutionID, email, false).then(res => {
      let userList = this.state.userList.filter(user => {
        return user.email != email;
      });
      this.setState({userList: userList});
      toaster.success(gettext('Successfully revoked the admin permission of {placeholder}.').replace('{placeholder}', name));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteUser = (email) => {
    seafileAPI.sysAdminDeleteInstitutionUser(this.props.institutionID, email).then(res => {
      let newUserList = this.state.userList.filter(user => {
        return user.email != email;
      });
      this.setState({userList: newUserList});
      toaster.success('success');
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    const { institutionName } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <InstitutionNav
              currentItem="admins"
              institutionID={this.props.institutionID}
              institutionName={institutionName}
            />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.userList}
                revokeAdmin={this.revokeAdmin}
                deleteUser={this.deleteUser}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default InstitutionAdmins;
