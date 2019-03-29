import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { siteRoot, serviceURL, gettext, orgID } from '../../utils/constants';
import { Utils } from '../../utils/utils.js';
import ModalPortal from '../../components/modal-portal';
import AddDepartDialog from '../../components/dialog/org-add-department-dialog';
import DeleteDepartDialog from '../../components/dialog/org-delete-department-dialog';
import SetGroupQuotaDialog from '../../components/dialog/org-set-group-quota-dialog';
import '../../css/org-department-item.css';

class OrgDepartmentsList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groups: null,
      groupID: -1,
      groupName: '',
      showAddDepartDialog: false,
      showDeleteDepartDialog: false,
      showSetGroupQuotaDialog: false,
    };
  }

  listDepartGroups = () => {
    if (this.props.groupID) {
      seafileAPI.orgAdminListGroupInfo(orgID, this.props.groupID, true).then(res => {
        this.setState({
          groups: res.data.groups
        });
      });
    } else {
      seafileAPI.orgAdminListDepartGroups(orgID).then(res => {
        this.setState({
          groups: res.data.data
        });
      });
    }
  }

  showAddDepartDialog = () => {
    this.setState({ showAddDepartDialog: true });
  }

  showDeleteDepartDialog = (group) => {
    this.setState({ showDeleteDepartDialog: true, groupID: group.id, groupName: group.name });
  }

  showSetGroupQuotaDialog = (groupID) => {
    this.setState({ showSetGroupQuotaDialog: true, groupID: groupID });
  }

  toggleCancel = () => {
    this.setState({
      showAddDepartDialog: false,
      showDeleteDepartDialog: false,
      showSetGroupQuotaDialog: false,
    });
  }

  onDepartChanged = () => {
    this.listDepartGroups();
  }

  componentWillMount() {
    this.listDepartGroups();
  }

  render() {
    const groups = this.state.groups;
    let isSub = this.props.groupID ? true : false;
    let header = isSub ? gettext('Sub-departments') : gettext('Departments');
    let headerButton = isSub ? gettext('New Sub-departments') : gettext('New Departments');
    let noGroup = isSub ? gettext('No sub-departments') : gettext('No departments');
    return (
      <div className="main-panel-center flex-row h-100">
        <div className="cur-view-container o-auto">
          <div className="cur-view-path">
            <div className="fleft"><h3 className="sf-heading">{header}</h3></div>
            <div className="fright">
              <button className="btn-white operation-item" onClick={this.showAddDepartDialog}>{headerButton}</button>
            </div>
          </div>
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
                      <React.Fragment key={group.id}>
                        <GroupItem
                          group={group}
                          showDeleteDepartDialog={this.showDeleteDepartDialog}
                          showSetGroupQuotaDialog={this.showSetGroupQuotaDialog}
                        />
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              : 
              <p className="no-group">{noGroup}</p>
            }
          </div>
          <React.Fragment>
            {this.state.showAddDepartDialog && (
              <ModalPortal>
                <AddDepartDialog
                  toggle={this.toggleCancel}
                  onDepartChanged={this.onDepartChanged}
                  parentGroupID={this.props.groupID}
                />
              </ModalPortal>
            )}
            {this.state.showDeleteDepartDialog && (
              <ModalPortal>
                <DeleteDepartDialog
                  toggle={this.toggleCancel}
                  groupID={this.state.groupID}
                  groupName={this.state.groupName}
                  onDepartChanged={this.onDepartChanged}
                />
              </ModalPortal>
            )}
            {this.state.showSetGroupQuotaDialog && (
              <ModalPortal>
                <SetGroupQuotaDialog
                  toggle={this.toggleCancel}
                  groupID={this.state.groupID}
                  onDepartChanged={this.onDepartChanged}
                />
              </ModalPortal>
            )}
          </React.Fragment>
        </div>
      </div>
    );
  }
}

class GroupItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
    };
  }

  onMouseEnter = () => {
    this.setState({ highlight: true });
  }

  onMouseLeave = () => {
    this.setState({ highlight: false });
  }

  render() {
    const group = this.props.group;
    const highlight = this.state.highlight;
    const newHref = serviceURL + '/org/departmentadmin/groups/' + group.id + '/';
    return (
      <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><a href={newHref} onClick={this.changeOrgGroup}>{group.name}</a></td>
        <td>{moment(group.created_time).fromNow()}</td>
        <td onClick={this.props.showSetGroupQuotaDialog.bind(this, group.id)}>
          {Utils.bytesToSize(group.quota)}{' '}
          <span title="Edit Quota" className={`fa fa-pencil-alt attr-action-icon ${highlight ? '' : 'vh'}`}></span>
        </td>
        <td className="cursor-pointer text-center" onClick={this.props.showDeleteDepartDialog.bind(this, group)}>
          <a href="#" className={`sf2-icon-delete action-icon  ${highlight ? '' : 'vh'}`} title="Delete"></a>
        </td>
      </tr>
    );
  }
}

const GroupItemPropTypes = {
  group: PropTypes.object.isRequired,
  showSetGroupQuotaDialog: PropTypes.func.isRequired,
  showDeleteDepartDialog: PropTypes.func.isRequired,
};

GroupItem.propTypes = GroupItemPropTypes;

export default OrgDepartmentsList;