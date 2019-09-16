import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, loginUrl, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import OrgsNav from './orgs-nav';
import MainPanelTopbar from '../main-panel-topbar';
import SysAdminUserRoleEditor from '../../../components/select-editor/sysadmin-user-roles-editor';
import SysAdminAddOrgDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-org-dialog';
import CommonOperationDialog from '../../../components/dialog/common-operation-dialog';

class Content extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
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
                <th width="12%">{gettext('Name')}</th>
                <th width="18%">{gettext('Creator')}</th>
                <th width="18%">{gettext('Role')}</th>
                <th width="10%">{gettext('Space Used')}</th>
                <th width="32%">{gettext('Created At')}{' / '}{gettext('Expiration')}</th>
                <th width="10%">{gettext('Operations')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  availableRoles={this.props.availableRoles}
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
    this.props.deleteOrg(this.props.item.org_id)
  }

  render() {
    let {item, availableRoles } = this.props;
    let { isOpIconShown, isDeleteDialogOpen } = this.state;
    let iconVisibility = isOpIconShown ? '' : ' invisible';
    let deleteIconClassName = 'op-icon sf2-icon-delete' + iconVisibility;

    let orgName = '<span class="op-target">' + Utils.HTMLescape(item.org_name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', orgName);

    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><a href={siteRoot + 'sys/organization/' + item.org_id + '/users/'}>{item.org_name}</a></td>
          <td><a href={siteRoot + 'sys/user-info/' + item.creator_email + '/'}>{item.creator_email}</a></td>
          <td>
            <SysAdminUserRoleEditor
              isTextMode={true}
              isEditIconShow={isOpIconShown}
              currentRole={item.role}
              roleOptions={availableRoles}
              onRoleChanged={this.updateRole}
            />
          </td>
          <td>{Utils.bytesToSize(item.quota_usage)}</td>
          <td>
            <span className="item-meta-info">
              {moment(item.ctime).format('YYYY-MM-DD hh:mm:ss')}{' / '}{item.expiration ? moment(item.expiration).format('llll') : '--'}
            </span>
          </td>
          <td>
            <a href="#" className={deleteIconClassName} title={gettext('Delete')} onClick={this.toggleDeleteDialog}></a>
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationDialog
            title={gettext('Delete organization')}
            message={deleteDialogMsg}
            toggle={this.toggleDeleteDialog}
            executeOperation={this.deleteOrg}
            confirmBtnText={gettext('Delete')}
          />
        }
      </Fragment>
    );
  }
}

class OrgsAll extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      orgList: [],
      availableRoles: [],
      isAddOrgDialogOpen: false,
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListAllOrgs().then((res) => {
      this.setState({
        loading: false,
        orgList: res.data.organizations,
        availableRoles: res.data.available_roles
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
    seafileAPI.sysAdminUpdateOrgInfo(orgID, orgInfo).then(res => {
      let newOrgList = this.state.orgList.map(org => {
        if (org.org_id === orgID) {
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

  addOrg = (orgInfo) => {
    seafileAPI.sysAdminAddOrg(orgInfo.name, orgInfo.email, orgInfo.password).then(res => {
      let orgList = this.state.orgList;
      orgList.push(res.data);
      this.setState({orgList: orgList});
      this.toggleAddOrgDialog();
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
      toaster.success(gettext('Successfully deleted.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    let { isAddOrgDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleAddOrgDialog}>{gettext('Add organization')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <OrgsNav currentItem={'all'} />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.orgList}
                availableRoles={this.state.availableRoles}
                updateRole={this.updateRole}
                deleteOrg={this.deleteOrg}
              />
            </div>
          </div>
        </div>
        {isAddOrgDialogOpen &&
          <SysAdminAddOrgDialog
            toggle={this.toggleAddOrgDialog}
            addOrg={this.addOrg}
          />
        }
      </Fragment>
    );
  }
}

export default OrgsAll;
