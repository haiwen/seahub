import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import moment from 'moment';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, loginUrl, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import SysAdminUserRoleEditor from '../../../components/select-editor/sysadmin-user-role-editor';
import SysAdminAddOrgDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-org-dialog';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import MainPanelTopbar from '../main-panel-topbar';

const { availableRoles } = window.sysadmin.pageOptions;

class Content extends Component {

  constructor(props) {
    super(props);
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
          <h2>{gettext('No organizations')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="20%">{gettext('Name')}</th>
                <th width="20%">{gettext('Creator')}</th>
                <th width="20%">{gettext('Role')}</th>
                <th width="15%">{gettext('Space Used')}</th>
                <th width="20%">{gettext('Created At')}</th>
                <th width="5%">{/* Operations */}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  updateRole={this.props.updateRole}
                  deleteOrg={this.props.deleteOrg}
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
      isDeleteDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseLeave = () => {
    this.setState({isOpIconShown: false});
  }

  toggleDeleteDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isDeleteDialogOpen: !this.state.isDeleteDialogOpen});
  }

  updateRole = (role) => {
    this.props.updateRole(this.props.item.org_id, role);
  }

  deleteOrg = () => {
    this.props.deleteOrg(this.props.item.org_id);
  }

  render() {
    const { item } = this.props;
    const { isOpIconShown, isDeleteDialogOpen } = this.state;

    const orgName = '<span class="op-target">' + Utils.HTMLescape(item.org_name) + '</span>';
    const deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', orgName);

    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><a href={`${siteRoot}sys/organizations/${item.org_id}/info/`}>{item.org_name}</a></td>
          <td><a href={`${siteRoot}useradmin/info/${encodeURIComponent(item.creator_email)}/`}>{item.creator_name}</a></td>
          <td>
            <SysAdminUserRoleEditor
              isTextMode={true}
              isEditIconShow={isOpIconShown}
              currentRole={item.role}
              roleOptions={availableRoles}
              onRoleChanged={this.updateRole}
            />
          </td>
          <td>{`${Utils.bytesToSize(item.quota_usage)} / ${item.quota > 0 ? Utils.bytesToSize(item.quota) : '--'}`}</td>
          <td>{moment(item.ctime).format('YYYY-MM-DD hh:mm:ss')}</td>
          <td>
            <a href="#" className={`action-icon sf2-icon-delete ${isOpIconShown ? '' : 'invisible'}`} title={gettext('Delete')} onClick={this.toggleDeleteDialog}></a>
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Delete Organization')}
            message={deleteDialogMsg}
            executeOperation={this.deleteOrg}
            confirmBtnText={gettext('Delete')}
            toggleDialog={this.toggleDeleteDialog}
          />
        }
      </Fragment>
    );
  }
}

class Orgs extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      orgList: [],
      isAddOrgDialogOpen: false
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListOrgs().then((res) => {
      this.setState({
        loading: false,
        orgList: res.data.organizations
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

  toggleAddOrgDialog = () => {
    this.setState({isAddOrgDialogOpen: !this.state.isAddOrgDialogOpen});
  }

  updateRole = (orgID, role) => {
    let orgInfo = {};
    orgInfo.role = role;
    seafileAPI.sysAdminUpdateOrg(orgID, orgInfo).then(res => {
      let newOrgList = this.state.orgList.map(org => {
        if (org.org_id == orgID) {
          org.role = role;
        }
        return org;
      });
      this.setState({orgList: newOrgList});
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  addOrg = (data) => {
    const { orgName, ownerEmail, password } = data;
    seafileAPI.sysAdminAddOrg(orgName, ownerEmail, password).then(res => {
      let orgList = this.state.orgList;
      orgList.unshift(res.data);
      this.setState({orgList: orgList});
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteOrg = (orgID) => {
    seafileAPI.sysAdminDeleteOrg(orgID).then(res => {
      let orgList = this.state.orgList.filter(org => {
        return org.org_id != orgID;
      });
      this.setState({orgList: orgList});
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    const { isAddOrgDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleAddOrgDialog}>{gettext('Add Organization')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Organizations')}</h3>
            </div> 
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.orgList}
                updateRole={this.updateRole}
                deleteOrg={this.deleteOrg}
              />
            </div>
          </div>
        </div>
        {isAddOrgDialogOpen &&
          <SysAdminAddOrgDialog
            addOrg={this.addOrg}
            toggleDialog={this.toggleAddOrgDialog}
          />
        }
      </Fragment>
    );
  }
}

export default Orgs;
