import React, { Component, Fragment } from 'react';
import { Link } from '@gatsbyjs/reach-router';
import moment from 'moment';
import { Utils } from '../../../utils/utils';
import { siteRoot, gettext } from '../../../utils/constants';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import { seafileAPI } from '../../../utils/seafile-api.js';
import SysAdminUserRoleEditor from '../../../components/select-editor/sysadmin-user-role-editor';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import UserLink from '../user-link';
import toaster from '../../../components/toast';

const { availableRoles } = window.sysadmin.pageOptions;

class Content extends Component {

  constructor(props) {
    super(props);
  }

  getPreviousPage = () => {
    this.props.getListByPage(this.props.currentPage - 1);
  }

  getNextPage = () => {
    this.props.getListByPage(this.props.currentPage + 1);
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
          {this.props.currentPage &&
          <Paginator
            currentPage={this.props.currentPage}
            hasNextPage={this.props.hasNextPage}
            curPerPage={this.props.curPerPage}
            resetPerPage={this.props.resetPerPage}
            gotoPreviousPage={this.getPreviousPage}
            gotoNextPage={this.getNextPage}
          />
          }
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
      isDeleteDialogOpen: false,
      deleteDialogMsg: '',
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
    this.setState({isDeleteDialogOpen: !this.state.isDeleteDialogOpen}, () => {
      if (this.state.isDeleteDialogOpen) {
        seafileAPI.sysAdminGetOrg(this.props.item.org_id).then((res) => {
          let orgName = '<span class="op-target">' + Utils.HTMLescape(res.data.org_name) + '</span>';
          let userCount = '<span class="op-target">' + Utils.HTMLescape(res.data.users_count) + '</span>';
          let repoCount = '<span class="op-target">' + Utils.HTMLescape(res.data.repos_count) + '</span>';
          let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?')
            .replace('{placeholder}', orgName) + '<br/>' +
            gettext('{userCount} user(s) and {repoCount} libraries of this organization will also be deleted.')
              .replace('{userCount}', userCount)
              .replace('{repoCount}', repoCount);
          this.setState({deleteDialogMsg: deleteDialogMsg});
        }).catch(error => {
          let errorMsg = Utils.getErrorMsg(error);
          toaster.danger(errorMsg);
        });
      }
    });
  }

  updateRole = (role) => {
    this.props.updateRole(this.props.item.org_id, role);
  }

  deleteOrg = () => {
    toaster.notify(gettext('It may take some time, please wait.'));
    this.props.deleteOrg(this.props.item.org_id);
  }

  render() {
    const { item } = this.props;
    const { isOpIconShown, isDeleteDialogOpen, deleteDialogMsg } = this.state;

    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><Link to={`${siteRoot}sys/organizations/${item.org_id}/info/`}>{item.org_name}</Link></td>
          <td>
            <UserLink email={item.creator_email} name={item.creator_name} />
          </td>
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
          <td>{moment(item.ctime).format('YYYY-MM-DD HH:mm:ss')}</td>
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

export default Content;
