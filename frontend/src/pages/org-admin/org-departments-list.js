import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from '@gatsbyjs/reach-router';
import { Utils } from '../../utils/utils.js';
import { seafileAPI } from '../../utils/seafile-api';
import MainPanelTopbar from './main-panel-topbar';
import ModalPortal from '../../components/modal-portal';
import AddDepartDialog from '../../components/dialog/org-add-department-dialog';
import DeleteDepartDialog from '../../components/dialog/org-delete-department-dialog';
import SetGroupQuotaDialog from '../../components/dialog/org-set-group-quota-dialog';
import RenameDepartmentDialog from '../../components/dialog/org-rename-department-dialog';
import OpMenu from '../../components/dialog/op-menu';
import { siteRoot, gettext, orgID, lang } from '../../utils/constants';
import '../../css/org-department-item.css';

moment.locale(lang);

class OrgDepartmentsList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groups: null,
      groupID: '',
      groupName: '',
      showDeleteDepartDialog: false,
      showSetGroupQuotaDialog: false,
      isShowAddDepartDialog: false,
      isItemFreezed: false,
    };
  }

  componentDidMount() {
    this.listDepartGroups();
  }

  listDepartGroups = () => {
    seafileAPI.orgAdminListDepartGroups(orgID).then(res => {
      this.setState({ groups: res.data.data });
    });
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
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

  showDeleteDepartDialog = (group) => {
    this.setState({ showDeleteDepartDialog: true, groupID: group.id, groupName: group.name });
  }

  showSetGroupQuotaDialog = (groupID) => {
    this.setState({ showSetGroupQuotaDialog: true, groupID: groupID });
  }

  toggleAddDepartDialog = () => {
    this.setState({ isShowAddDepartDialog: !this.state.isShowAddDepartDialog});
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
        <MainPanelTopbar children={topbarChildren}/>
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
                        <React.Fragment key={group.id}>
                          <GroupItem
                            group={group}
                            isItemFreezed={this.state.isItemFreezed}
                            onFreezedItem={this.onFreezedItem}
                            onUnfreezedItem={this.onUnfreezedItem}
                            onDepartmentNameChanged={this.onDepartmentNameChanged}
                            showDeleteDepartDialog={this.showDeleteDepartDialog}
                            showSetGroupQuotaDialog={this.showSetGroupQuotaDialog}
                          />
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                :
                <p className="no-group">{gettext('No departments')}</p>
              }
            </div>
            <React.Fragment>
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
      </Fragment>
    );
  }
}

class GroupItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isOpIconShown: false,
      isRenameDialogOpen: false,
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  }

  translateOperations = (item) => {
    let translateResult = '';
    switch(item) {
      case 'Rename':
        translateResult = gettext('Rename');
        break;
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      default:
        break;
    }

    return translateResult;
  }

  onMenuItemClick = (operation) => {
    const { group } = this.props;
    switch(operation) {
      case 'Rename':
        this.toggleRenameDialog();
        break;
      case 'Delete':
        this.props.showDeleteDepartDialog(group);
        break;
      default:
        break;
    }
  }

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  }

  toggleRenameDialog = () => {
    this.setState({
      isRenameDialogOpen: !this.state.isRenameDialogOpen
    });
  }

  render() {
    const group = this.props.group;
    const { highlight, isOpIconShown, isRenameDialogOpen } = this.state;
    const newHref = siteRoot+ 'org/departmentadmin/groups/' + group.id + '/';
    return (
      <Fragment>
        <tr className={highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td><Link to={newHref}>{group.name}</Link></td>
          <td>{moment(group.created_at).fromNow()}</td>
          <td onClick={this.props.showSetGroupQuotaDialog.bind(this, group.id)}>
            {Utils.bytesToSize(group.quota)}{' '}
            <span title="Edit Quota" className={`fa fa-pencil-alt attr-action-icon ${highlight ? '' : 'vh'}`}></span>
          </td>
          <td>
            {isOpIconShown &&
              <OpMenu
                operations={['Rename', 'Delete']}
                translateOperations={this.translateOperations}
                onMenuItemClick={this.onMenuItemClick}
                onFreezedItem={this.props.onFreezedItem}
                onUnfreezedItem={this.onUnfreezedItem}
              />
            }
          </td>
        </tr>
        {isRenameDialogOpen && (
          <RenameDepartmentDialog
            orgID={orgID}
            groupID={group.id}
            name={group.name}
            toggle={this.toggleRenameDialog}
            onDepartmentNameChanged={this.props.onDepartmentNameChanged}
          />
        )}
      </Fragment>
    );
  }
}

const GroupItemPropTypes = {
  group: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onDepartmentNameChanged: PropTypes.func.isRequired,
  showSetGroupQuotaDialog: PropTypes.func.isRequired,
  showDeleteDepartDialog: PropTypes.func.isRequired,
};

GroupItem.propTypes = GroupItemPropTypes;

export default OrgDepartmentsList;
