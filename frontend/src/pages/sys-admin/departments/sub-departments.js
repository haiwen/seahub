import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils.js';
import toaster from '../../../components/toast';
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
      isItemFreezed: false,
      groups: []
    };
  }

  componentDidMount() {
    this.listSubDepartments(this.props.groupID);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.groupID !== nextProps.groupID) {
      this.listSubDepartments(nextProps.groupID);
    }
  }

  listSubDepartments = (groupID) => {
    seafileAPI.sysAdminGetDepartmentInfo(groupID, true).then(res => {
      this.setState({groups: res.data.groups});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
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

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  onAddNewDepartment = (newDepartment) => {
    const { groups } = this.state;
    groups.unshift(newDepartment);
    this.setState({
      groups: groups
    });
  }

  onDeleteDepartment = (id) => {
    const { groups } = this.state;
    this.setState({
      groups: groups.filter(item => item.id != id)
    });
  }

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
  }

  render() {
    const { groups } = this.state;
    const { groupID } = this.props;

    return (
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
                    <GroupItem
                      key={group.id}
                      isItemFreezed={this.state.isItemFreezed}
                      onFreezedItem={this.onFreezedItem}
                      onUnfreezedItem={this.onUnfreezedItem}
                      onDepartmentNameChanged={this.onSubDepartmentNameChanged}
                      group={group}
                      onDeleteDepartment={this.onDeleteDepartment}
                      onSetDepartmentQuota={this.onSetDepartmentQuota}
                    />
                  );
                })}
              </tbody>
            </table>
            : <p className="no-group">{gettext('No sub-departments')}</p>
          }
        </div>
      </Department>
    );
  }
}

SubDepartments.propTypes = SubDepartmentsPropTypes;

export default SubDepartments;
