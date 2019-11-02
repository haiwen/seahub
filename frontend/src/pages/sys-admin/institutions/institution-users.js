import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import moment from 'moment';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, loginUrl, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import AddMemberDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-institution-member-dialog';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import MainPanelTopbar from '../main-panel-topbar';
import InstitutionNav from './institution-nav';
import Paginator from '../../../components/paginator';
import OpMenu from './user-op-menu';

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
                  revokeAdmin={this.props.revokeAdmin}
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
            canResetPerPage={true}
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

  toggleSetAdminDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isSetAdminDialogOpen: !this.state.isSetAdminDialogOpen});
  }

  toggleRevokeAdminDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isRevokeAdminDialogOpen: !this.state.isRevokeAdminDialogOpen});
  }

  setAdmin = () => {
    this.props.setAdmin(this.props.item.email);
  }

  revokeAdmin = () => {
    this.props.revokeAdmin(this.props.item.email);
  }

  onMenuItemClick = (operation) => {
    switch (operation) {
      case 'Delete':
        this.props.deleteUser(this.props.item.email);
        break;
      case 'Set Admin':
        this.props.setAdmin(this.props.item.email);
        break;
      case 'Revoke Admin':
        this.props.revokeAdmin(this.props.item.email);
        break;
    }
  }

  render() {
    const { item } = this.props;
    const { isOpIconShown, isSetAdminDialogOpen, isRevokeAdminDialogOpen } = this.state;

    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><a href={`${siteRoot}useradmin/info/${encodeURIComponent(item.email)}/`}>{item.name}</a></td>
          <td>
            {item.is_active ? gettext('Active') : gettext('Inactive')}
          </td>
          <td>{`${Utils.bytesToSize(item.quota_usage)} / ${item.quota_total > 0 ? Utils.bytesToSize(item.quota_total) : '--'}`}</td>
          <td>
            {moment(item.create_time).format('YYYY-MM-DD hh:mm:ss')}{' / '}{item.last_login ? moment(item.last_login).fromNow() : '--'}
          </td>
          {/* <td>
            {isOpIconShown && (
              item.is_institution_admin ?
                <a href="#" onClick={this.toggleRevokeAdminDialog}>{gettext('Revoke Admin')}</a>
                :<a href="#" onClick={this.toggleSetAdminDialog}>{gettext('Set Admin')}</a>
            )
            }
          </td> */}
          <td>
            {isOpIconShown &&
            <OpMenu
              isInstitutionAdmin={item.is_institution_admin}
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
            message={gettext('Sure?')}
            executeOperation={this.setAdmin}
            toggleDialog={this.toggleSetAdminDialog}
          />
        }
        {isRevokeAdminDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Revoke Admin')}
            message={gettext('Sure?')}
            executeOperation={this.revokeAdmin}
            toggleDialog={this.toggleRevokeAdminDialog}
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
      perPage: 100,
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
    this.getInstitutionUsersByPage(this.initPage);
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
  
  revokeAdmin = (email) => {
    seafileAPI.sysAdminUpdateInstitutionUser(this.props.institutionID, email, false).then(res => {
      let userList = this.state.userList.map(user => {
        if (user.email == email) {
          user.is_institution_admin = false;
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
    seafileAPI.sysAdminAddInstitutionUser(this.props.institutionID, emails).then(res => {
      let successArray = res.data.success;
      let failedArray = res.data.failed;
      let tipStr = gettext('Add {totalCount} members. {successCount} success, {failedCount} failed.')
        .replace('{totalCount}', emails.length)
        .replace('{successCount}', successArray.length)
        .replace('{failedCount}', failedArray.length);
      if (successArray.length > 0) {
        toaster.success(tipStr);
      } else {
        toaster.danger(tipStr);
      }
      let newUserList = this.state.userList.concat(successArray);
      this.setState({userList: newUserList});
      this.toggleAddUserDialog();
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
        <MainPanelTopbar>
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
                revokeAdmin={this.revokeAdmin}
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
