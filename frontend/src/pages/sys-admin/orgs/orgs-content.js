import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import dayjs from 'dayjs';
import { Utils } from '../../../utils/utils';
import { siteRoot, gettext } from '../../../utils/constants';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import RoleSelector from '../../../components/single-selector';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import UserLink from '../user-link';
import toaster from '../../../components/toast';

const { availableRoles } = window.sysadmin.pageOptions;

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  toggleItemFreezed = (isFreezed) => {
    this.setState({ isItemFreezed: isFreezed });
  };

  getPreviousPage = () => {
    this.props.getListByPage(this.props.currentPage - 1);
  };

  getNextPage = () => {
    this.props.getListByPage(this.props.currentPage + 1);
  };

  sortByQuotaUsage = (e) => {
    e.preventDefault();
    this.props.sortByQuotaUsage();
  };

  render() {
    const { loading, errorMsg, items, sortBy, sortOrder } = this.props;
    let sortIcon;
    if (sortBy == '') {
      // initial sort icon
      sortIcon = <span className="sf3-font sf3-font-sort3"></span>;
    } else {
      sortIcon = <span className={`sf3-font ${sortOrder == 'asc' ? 'sf3-font-down rotate-180 d-inline-block' : 'sf3-font-down'}`}></span>;
    }
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip text={gettext('No organizations')}>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="20%">{gettext('Name')}</th>
                <th width="20%">{gettext('Creator')}</th>
                <th width="15%">{gettext('Role')}</th>
                <th width="20%">
                  <a className="d-inline-block table-sort-op" href="#" onClick={this.sortByQuotaUsage}>{gettext('Space Used')} {sortIcon}</a> / {gettext('Quota')}
                </th>
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
                  isItemFreezed={this.state.isItemFreezed}
                  toggleItemFreezed={this.toggleItemFreezed}
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

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  getListByPage: PropTypes.func.isRequired,
  sortByQuotaUsage: PropTypes.func.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortBy: PropTypes.string.isRequired,
  currentPage: PropTypes.number,
  items: PropTypes.array.isRequired,
  updateRole: PropTypes.func.isRequired,
  deleteOrg: PropTypes.func.isRequired,
  hasNextPage: PropTypes.bool,
  resetPerPage: PropTypes.func,
  curPerPage: PropTypes.number,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      highlighted: false,
      isDeleteDialogOpen: false,
      deleteDialogMsg: '',
    };
  }

  handleMouseEnter = () => {
    if (this.props.isItemFreezed) return;
    this.setState({ highlighted: true });
  };

  handleMouseLeave = () => {
    if (this.props.isItemFreezed) return;
    this.setState({ highlighted: false });
  };

  toggleDeleteDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({ isDeleteDialogOpen: !this.state.isDeleteDialogOpen }, () => {
      if (this.state.isDeleteDialogOpen) {
        systemAdminAPI.sysAdminGetOrg(this.props.item.org_id).then((res) => {
          let orgName = '<span class="op-target">' + Utils.HTMLescape(res.data.org_name) + '</span>';
          let userCount = '<span class="op-target">' + Utils.HTMLescape(res.data.users_count) + '</span>';
          let repoCount = '<span class="op-target">' + Utils.HTMLescape(res.data.repos_count) + '</span>';
          let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?')
            .replace('{placeholder}', orgName) + '<br/>' +
            gettext('{userCount} user(s) and {repoCount} libraries of this organization will also be deleted.')
              .replace('{userCount}', userCount)
              .replace('{repoCount}', repoCount);
          this.setState({ deleteDialogMsg: deleteDialogMsg });
        }).catch(error => {
          let errorMsg = Utils.getErrorMsg(error);
          toaster.danger(errorMsg);
        });
      }
    });
  };

  translateRole = (role) => {
    switch (role) {
      case 'default':
        return gettext('Default');
      case 'guest':
        return gettext('Guest');
      default:
        return role;
    }
  };

  updateRole = (roleOption) => {
    this.props.updateRole(this.props.item.org_id, roleOption.value);
  };

  deleteOrg = () => {
    toaster.notify(gettext('It may take some time, please wait.'));
    this.props.deleteOrg(this.props.item.org_id);
  };

  render() {
    const { item } = this.props;
    const { highlighted, isDeleteDialogOpen, deleteDialogMsg } = this.state;

    const { role: curRole } = item;
    this.roleOptions = availableRoles.map(item => {
      return {
        value: item,
        text: this.translateRole(item),
        isSelected: item == curRole
      };
    });
    const currentSelectedOption = this.roleOptions.filter(item => item.isSelected)[0];

    return (
      <Fragment>
        <tr className={highlighted ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><Link to={`${siteRoot}sys/organizations/${item.org_id}/info/`}>{item.org_name}</Link></td>
          <td>
            <UserLink email={item.creator_email} name={item.creator_name} />
          </td>
          <td>
            <RoleSelector
              isDropdownToggleShown={highlighted}
              currentSelectedOption={currentSelectedOption}
              options={this.roleOptions}
              selectOption={this.updateRole}
              toggleItemFreezed={this.props.toggleItemFreezed}
            />
          </td>
          <td>{`${Utils.bytesToSize(item.quota_usage)} / ${item.quota > 0 ? Utils.bytesToSize(item.quota) : '--'}`}</td>
          <td>{dayjs(item.ctime).format('YYYY-MM-DD HH:mm:ss')}</td>
          <td>
            <a href="#" className={`action-icon sf3-font-delete1 sf3-font ${highlighted ? '' : 'invisible'}`} title={gettext('Delete')} onClick={this.toggleDeleteDialog}></a>
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

Item.propTypes = {
  item: PropTypes.object.isRequired,
  updateRole: PropTypes.func.isRequired,
  deleteOrg: PropTypes.func.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  toggleItemFreezed: PropTypes.func.isRequired
};

export default Content;
