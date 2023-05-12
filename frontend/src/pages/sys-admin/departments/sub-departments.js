import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils.js';
import toaster from '../../../components/toast';
import ModalPortal from '../../../components/modal-portal';
import DeleteDepartDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-delete-department-dialog';
import SetGroupQuotaDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-set-group-quota-dialog';
import { gettext, lang } from '../../../utils/constants';
import GroupItem from './group-item';
import Department from './department';

import '../../../css/org-department-item.css';

moment.locale(lang);

const SubDepartmentsPropTypes = {
  groupID: PropTypes.string
};

class SubDepartments extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      orgID: '',
      groupName: '',
      isItemFreezed: false,
      ancestorGroups: [],
      isShowRenameDepartmentDialog: false,
      groups: [],
      subGroupID: '',
      subGroupName: '',
      showDeleteDepartDialog: false,
      showSetGroupQuotaDialog: false,
    };
  }

  componentDidMount() {
    const groupID = this.props.groupID;
    this.getDepartmentInfo(groupID);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.groupID !== nextProps.groupID) {
      this.getDepartmentInfo(nextProps.groupID);
    }
  }

  getDepartmentInfo = (groupID) => {
    seafileAPI.sysAdminGetDepartmentInfo(groupID, true).then(res => {
      this.setState({
        groups: res.data.groups,
        ancestorGroups: res.data.ancestor_groups,
        groupName: res.data.name,
        orgID: res.data.org_id,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  listSubDepartGroups = (groupID) => {
    seafileAPI.sysAdminGetDepartmentInfo(groupID, true).then(res => {
      this.setState({ groups: res.data.groups });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggleCancel = () => {
    this.setState({
      showDeleteDepartDialog: false,
      showSetGroupQuotaDialog: false,
    });
  }

  onSubDepartChanged = () => {
    this.listSubDepartGroups(this.props.groupID);
  }

  onSubDepartmentNameChanged = (dept) => {
    this.setState({
      groups: this.state.groups.map(item => {
        if (item.id == dept.id) {
          item.name = dept.name;
        }
        return item;
      })
    });
  }

  toggleItemFreezed = (isFreezed) => {
    this.setState({ isItemFreezed: isFreezed });
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  showDeleteDepartDialog = (subGroup) => {
    this.setState({
      showDeleteDepartDialog: true,
      subGroupID: subGroup.id,
      subGroupName: subGroup.name
    });
  }

  showSetGroupQuotaDialog = (subGroupID) => {
    this.setState({
      showSetGroupQuotaDialog: true,
      subGroupID: subGroupID
    });
  }

  onAddNewDepartment = (newDepartment) => {
    const { groups } = this.state;
    groups.unshift(newDepartment);
    this.setState({
      groups: groups
    });
  }

  render() {
    const { groups } = this.state;
    const { groupID } = this.props;

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
                    return(
                      <Fragment key={group.id}>
                        <GroupItem
                          orgID={this.state.orgID}
                          isItemFreezed={this.state.isItemFreezed}
                          onFreezedItem={this.onFreezedItem}
                          onUnfreezedItem={this.onUnfreezedItem}
                          onDepartmentNameChanged={this.onSubDepartmentNameChanged}
                          group={group}
                          showDeleteDepartDialog={this.showDeleteDepartDialog}
                          showSetGroupQuotaDialog={this.showSetGroupQuotaDialog}
                        />
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              : <p className="no-group">{gettext('No sub-departments')}</p>
            }
          </div>
        </Department>
        {this.state.showDeleteDepartDialog && (
          <ModalPortal>
            <DeleteDepartDialog
              toggle={this.toggleCancel}
              groupID={this.state.subGroupID}
              groupName={this.state.subGroupName}
              onDepartChanged={this.onSubDepartChanged}
            />
          </ModalPortal>
        )}
        {this.state.showSetGroupQuotaDialog && (
          <ModalPortal>
            <SetGroupQuotaDialog
              toggle={this.toggleCancel}
              groupID={this.state.subGroupID}
              onDepartChanged={this.onSubDepartChanged}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

SubDepartments.propTypes = SubDepartmentsPropTypes;

export default SubDepartments;
