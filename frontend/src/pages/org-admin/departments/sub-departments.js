import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { orgAdminAPI } from '../../../utils/org-admin-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import { gettext, orgID, lang } from '../../../utils/constants';
import EmptyTip from '../../../components/empty-tip';
import Department from './department';
import GroupItem from './group-item';
import '../../../css/org-department-item.css';

dayjs.locale(lang);

class OrgDepartmentItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groupName: '',
      isItemFreezed: false,
      isDepartFreezed: false,
      ancestorGroups: [],
      members: [],
      isShowAddMemberDialog: false,
      repos: [],
      deletedRepo: {},
      groups: [],
    };
  }

  componentDidMount() {
    const groupID = this.props.groupID;
    this.listOrgMembers(groupID);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (this.props.groupID !== nextProps.groupID) {
      this.listOrgMembers(nextProps.groupID);
    }
  }

  listOrgMembers = (groupID) => {
    orgAdminAPI.orgAdminListGroupInfo(orgID, groupID, true).then(res => {
      this.setState({
        members: res.data.members,
        groups: res.data.groups,
        ancestorGroups: res.data.ancestor_groups,
        groupName: res.data.name,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  listSubDepartGroups = (groupID) => {
    orgAdminAPI.orgAdminListGroupInfo(orgID, groupID, true).then(res => {
      this.setState({ groups: res.data.groups });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onFreezedDepart = () => {
    this.setState({ isDepartFreezed: true });
  };

  onUnfreezedDepart = () => {
    this.setState({ isDepartFreezed: false });
  };

  onDepartmentNameChanged = (dept) => {
    this.setState({
      groups: this.state.groups.map(item => {
        if (item.id == dept.id) {
          item.name = dept.name;
        }
        return item;
      })
    });
  };

  onAddNewDepartment = (newDepartment) => {
    const { groups } = this.state;
    groups.unshift(newDepartment);
    this.setState({
      groups: groups
    });
  };

  onDeleteDepartment = (id) => {
    const { groups } = this.state;
    this.setState({
      groups: groups.filter((item) => item.id != id)
    });
  };

  onSetDepartmentQuota = (target) => {
    const { groups } = this.state;
    this.setState({
      groups: groups.map((item) => {
        if (item.id == target.id) {
          item.quota = target.quota;
        }
        return item;
      })
    });
  };

  render() {
    const { groups } = this.state;
    const groupID = this.props.groupID;

    return (
      <Fragment>
        <Department
          groupID={groupID}
          currentItem="subDepartments"
          onAddNewDepartment={this.onAddNewDepartment}
        >
          <div className="cur-view-content">
            {groups && groups.length > 0 ?
              <table>
                <thead>
                  <tr>
                    <th width="40%">{gettext('Name')}</th>
                    <th width="25%">{gettext('Created At')}</th>
                    <th width="20%">{gettext('Quota')}</th>
                    <th width="15%"></th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group, index) => {
                    return (
                      <React.Fragment key={group.id}>
                        <GroupItem
                          group={group}
                          isItemFreezed={this.state.isDepartFreezed}
                          onFreezedItem={this.onFreezedDepart}
                          onUnfreezedItem={this.onUnfreezedDepart}
                          onDepartmentNameChanged={this.onDepartmentNameChanged}
                          onDeleteDepartment={this.onDeleteDepartment}
                          onSetDepartmentQuota={this.onSetDepartmentQuota}
                        />
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              : <EmptyTip text={gettext('No sub-departments')}/>
            }
          </div>
        </Department>
      </Fragment>
    );
  }
}

const OrgDepartmentItemPropTypes = {
  groupID: PropTypes.string,
};

OrgDepartmentItem.propTypes = OrgDepartmentItemPropTypes;

export default OrgDepartmentItem;
