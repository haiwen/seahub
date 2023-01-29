import React, { Fragment } from 'react';
import moment from 'moment';
import { seafileAPI } from '../../../utils/seafile-api';
import MainPanelTopbar from '../main-panel-topbar';
import ModalPortal from '../../../components/modal-portal';
import AddDepartDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-department-dialog';
import DeleteDepartDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-delete-department-dialog';
import SetGroupQuotaDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-set-group-quota-dialog';
import { gettext, lang } from '../../../utils/constants';
import GroupItem from './group-item';
import '../../../css/org-department-item.css';

moment.locale(lang);

class DepartmentsList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groups: null,
      groupID: '',
      groupName: '',
      showDeleteDepartDialog: false,
      showSetGroupQuotaDialog: false,
      isShowAddDepartDialog: false,
      isItemFreezed: false
    };
  }

  componentDidMount() {
    this.listDepartGroups();
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  listDepartGroups = () => {
    seafileAPI.sysAdminListAllDepartments().then(res => {
      this.setState({ groups: res.data.data });
    });
  }

  showDeleteDepartDialog = (group) => {
    this.setState({ showDeleteDepartDialog: true, groupID: group.id, groupName: group.name });
  }

  showSetGroupQuotaDialog = (groupID) => {
    this.setState({ showSetGroupQuotaDialog: true, groupID: groupID });
  }

  toggleAddDepartDialog = () => {
    this.setState({ isShowAddDepartDialog: !this.state.isShowAddDepartDialog });
  }

  toggleCancel = () => {
    this.setState({
      showDeleteDepartDialog: false,
      showSetGroupQuotaDialog: false,
    });
  }

  onDepartChanged = () => {
    this.listDepartGroups();
  }

  onDepartmentNameChanged = (dept) => {
    this.setState({
      groups: this.state.groups.map(item => {
        if (item.id == dept.id) {
          item.name = dept.name;
        }
        return item;
      })
    });
  }

  render() {
    const groups = this.state.groups;
    const topbarChildren = (
      <Fragment>
        <button className='btn btn-secondary operation-item' title={gettext('New Department')} onClick={this.toggleAddDepartDialog}>{gettext('New Department')}
        </button>
        {this.state.isShowAddDepartDialog && (
          <ModalPortal>
            <AddDepartDialog
              onDepartChanged={this.onDepartChanged}
              groupID={this.state.groupID}
              toggle={this.toggleAddDepartDialog}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
    return (
      <Fragment>
        <MainPanelTopbar {...this.props}>
          {topbarChildren}
        </MainPanelTopbar>
        <div className="main-panel-center flex-row h-100">
          <div className="cur-view-container o-auto">
            <div className="cur-view-path">
              <div className="fleft">
                <h3 className="sf-heading">{gettext('Departments')}</h3>
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
                        <Fragment key={group.id}>
                          <GroupItem
                            group={group}
                            isItemFreezed={this.state.isItemFreezed}
                            onFreezedItem={this.onFreezedItem}
                            onUnfreezedItem={this.onUnfreezedItem}
                            onDepartmentNameChanged={this.onDepartmentNameChanged}
                            showDeleteDepartDialog={this.showDeleteDepartDialog}
                            showSetGroupQuotaDialog={this.showSetGroupQuotaDialog}
                          />
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                :
                <p className="no-group">{gettext('No departments')}</p>
              }
            </div>
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
          </div>
        </div>
      </Fragment>
    );
  }
}

export default DepartmentsList;
