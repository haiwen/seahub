import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import moment from 'moment';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import OpMenu from '../../../components/dialog/op-menu';
import AddMemberDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-institution-member-dialog';
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

  getPreviousPage = () => {
    this.props.getInstitutionUsersByPage(this.props.currentPage - 1);
  }

  getNextPage = () => {
    this.props.getInstitutionUsersByPage(this.props.currentPage + 1);
  }

  render() {
    const { loading, errorMsg, items, perPage, currentPage, hasNextPage } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No members')}</h2>
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
                  setAdmin={this.props.setAdmin}
                  deleteUser={this.props.deleteUser}
                />);
              })}
            </tbody>
          </table>
          <Paginator
            gotoPreviousPage={this.getPreviousPage}
            gotoNextPage={this.getNextPage}
            currentPage={currentPage}
            hasNextPage={hasNextPage}
            curPerPage={perPage}
            resetPerPage={this.props.resetPerPage}
          />
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
      isSetAdminDialogOpen: false,
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

  toggleSetAdminDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isSetAdminDialogOpen: !this.state.isSetAdminDialogOpen});
  }

  setAdmin = () => {
    this.props.setAdmin(this.props.item.email);
  }

  onMenuItemClick = (operation) => {
    switch (operation) {
      case 'Delete':
        this.props.deleteUser(this.props.item.email);
        break;
      case 'Set Admin':
        this.toggleSetAdminDialog();
        break;
    }
  }

  getOperations = () => {
    let operations = [];
    if (!this.props.item.is_institution_admin) {
      operations.push('Set Admin');
    }
    operations.push('Delete');
    return operations;
  }

  translateOperations = (item) => {
    let translateResult = '';
    switch(item) {
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      case 'Set Admin':
        translateResult = gettext('Set Admin');
        break;
    }

    return translateResult;
  }

  render() {
    const { item } = this.props;
    const { isOpIconShown, isSetAdminDialogOpen } = this.state;

    const itemName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    const dialogMsg = gettext('Are you sure you want to set {placeholder} as Admin?').replace('{placeholder}', itemName);

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
                operations={this.getOperations()}
                translateOperations={this.translateOperations}
                onMenuItemClick={this.onMenuItemClick}
                onFreezedItem={this.props.onFreezedItem}
                onUnfreezedItem={this.onUnfreezedItem}
              />
            }
          </td>
        </tr>
        {isSetAdminDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Set Admin')}
            message={dialogMsg}
            executeOperation={this.setAdmin}
            toggleDialog={this.toggleSetAdminDialog}
            confirmBtnText={gettext('Set Admin')}
          />
        }
      </Fragment>
    );
  }
}

class InstitutionUsers extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      institutionName: '',
      userList: [],
      perPage: 25,
      currentPage: 1,
      hasNextPage: false,
      isAddUserDialogOpen: false
    };
    this.initPage = 1;
  }

  componentDidMount () {
    seafileAPI.sysAdminGetInstitution(this.props.institutionID).then((res) => {
      this.setState({
        institutionName: res.data.name
      });
    });

    let urlParams = (new URL(window.location)).searchParams;
    const { currentPage, perPage } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getInstitutionUsersByPage(this.state.currentPage);
    });
  }

  getInstitutionUsersByPage = (page) => {
    let { perPage } = this.state;
    seafileAPI.sysAdminListInstitutionUsers(this.props.institutionID, page, perPage).then((res) => {
      this.setState({
        loading: false,
        userList: res.data.user_list,
        currentPage: page,
        hasNextPage: Utils.hasNextPage(page, perPage, res.data.total_count),
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  setAdmin = (email) => {
    seafileAPI.sysAdminUpdateInstitutionUser(this.props.institutionID, email, true).then(res => {
      let userList = this.state.userList.map(user => {
        if (user.email == email) {
          user.is_institution_admin = true;
        }
        return user;
      });
      this.setState({userList: userList});
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggleAddUserDialog = () => {
    this.setState({isAddUserDialogOpen: !this.state.isAddUserDialogOpen});
  }

  resetPerPage = (newPerPage) => {
    this.setState({
      perPage: newPerPage,
    }, () => this.getInstitutionUsersByPage(this.initPage));
  }

  addUser = (emails) => {
    seafileAPI.sysAdminAddInstitutionUserBatch(this.props.institutionID, emails).then(res => {
      this.toggleAddUserDialog();
      let successArray = res.data.success;
      let failedArray = res.data.failed;
      if (successArray.length) {
        let newUserList = this.state.userList.concat(successArray);
        this.setState({userList: newUserList});
      }
      failedArray.map((item) => {
        toaster.danger(item.error_msg);
      });
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
    const { isAddUserDialogOpen, institutionName, hasNextPage, currentPage, perPage } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props}>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleAddUserDialog}>{gettext('Add Member')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <InstitutionNav
              currentItem="members"
              institutionID={this.props.institutionID}
              institutionName={institutionName}
            />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.userList}
                setAdmin={this.setAdmin}
                deleteUser={this.deleteUser}
                currentPage={currentPage}
                perPage={perPage}
                hasNextPage={hasNextPage}
                getInstitutionUsersByPage={this.getInstitutionUsersByPage}
                resetPerPage={this.resetPerPage}
              />
            </div>
          </div>
        </div>
        {isAddUserDialogOpen &&
          <AddMemberDialog
            addUser={this.addUser}
            toggle={this.toggleAddUserDialog}
          />
        }
      </Fragment>
    );
  }
}

export default InstitutionUsers;
