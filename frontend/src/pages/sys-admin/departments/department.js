import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from '@gatsbyjs/reach-router';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils.js';
import toaster from '../../../components/toast';
import MainPanelTopbar from '../main-panel-topbar';
import ModalPortal from '../../../components/modal-portal';
import AddDepartmentDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-department-dialog';
import RenameDepartmentDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-rename-department-dialog';
import AddMemberDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-member-dialog';
import AddRepoDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-repo-dialog';
import { siteRoot, gettext, lang } from '../../../utils/constants';

import '../../../css/org-department-item.css';

moment.locale(lang);

const DepartmentDetailPropTypes = {
  groupID: PropTypes.string,
  currentItem: PropTypes.string.isRequired,
  onAddNewDepartment: PropTypes.func,
  onAddNewMembers: PropTypes.func,
  onAddNewRepo: PropTypes.func,
  children: PropTypes.object
};

class Department extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groupName: '',
      ancestorGroups: [],
      isShowAddDepartmentDialog: false,
      isShowAddMemberDialog: false,
      isShowRenameDepartmentDialog: false,
      isShowAddRepoDialog: false
    };

    this.navItems = [
      {name: 'subDepartments', urlPart: '/', text: gettext('Sub-departments')},
      {name: 'members', urlPart: '/members/', text: gettext('Members')},
      {name: 'repos', urlPart: '/libraries/', text: gettext('Libraries')}
    ];
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
        ancestorGroups: res.data.ancestor_groups,
        groupName: res.data.name,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onDepartmentNameChanged = (dept) => {
    this.setState({
      groupName: dept.name
    });
  }

  toggleRenameDepartmentDialog = () => {
    this.setState({ isShowRenameDepartmentDialog: !this.state.isShowRenameDepartmentDialog });
  }

  toggleAddRepoDialog = () => {
    this.setState({ isShowAddRepoDialog: !this.state.isShowAddRepoDialog });
  }

  toggleAddMemberDialog = () => {
    this.setState({ isShowAddMemberDialog: !this.state.isShowAddMemberDialog });
  }

  toggleAddDepartmentDialog = () => {
    this.setState({ isShowAddDepartmentDialog: !this.state.isShowAddDepartmentDialog});
  }

  render() {
    const { groupID, currentItem } = this.props;
    const { groupName } = this.state;

    const topBtn = 'btn btn-secondary operation-item';
    const topbarChildren = (
      <Fragment>
        {groupID &&
          <Fragment>
            <button className={topBtn} title={gettext('Rename Department')} onClick={this.toggleRenameDepartmentDialog}>{gettext('Rename Department')}</button>
            {currentItem == 'subDepartments' && <button className={topBtn} title={gettext('New Sub-department')} onClick={this.toggleAddDepartmentDialog}>{gettext('New Sub-department')}</button>}
            {currentItem == 'members' && <button className={topBtn} title={gettext('Add Member')} onClick={this.toggleAddMemberDialog}>{gettext('Add Member')}</button>}
            {currentItem == 'repos' && <button className={topBtn} onClick={this.toggleAddRepoDialog} title={gettext('New Library')}>{gettext('New Library')}</button>}
          </Fragment>
        }
        {this.state.isShowRenameDepartmentDialog && (
          <ModalPortal>
            <RenameDepartmentDialog
              groupID={groupID}
              name={groupName}
              toggle={this.toggleRenameDepartmentDialog}
              onDepartmentNameChanged={this.onDepartmentNameChanged}
            />
          </ModalPortal>
        )}
        {this.state.isShowAddMemberDialog && (
          <ModalPortal>
            <AddMemberDialog
              toggle={this.toggleAddMemberDialog}
              onAddNewMembers={this.props.onAddNewMembers}
              groupID={groupID}
            />
          </ModalPortal>
        )}
        {this.state.isShowAddRepoDialog && (
          <ModalPortal>
            <AddRepoDialog
              toggle={this.toggleAddRepoDialog}
              onAddNewRepo={this.props.onAddNewRepo}
              groupID={groupID}
            />
          </ModalPortal>
        )}
        {this.state.isShowAddDepartmentDialog && (
          <ModalPortal>
            <AddDepartmentDialog
              onAddNewDepartment={this.props.onAddNewDepartment}
              parentGroupID={groupID}
              toggle={this.toggleAddDepartmentDialog}
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
                <h3 className="sf-heading">
                  {groupID ?
                    <Link to={siteRoot + 'sys/departments/'}>{gettext('Departments')}</Link>
                    : <span>{gettext('Departments')}</span>
                  }
                  {this.state.ancestorGroups.map(ancestor => {
                    let newHref = siteRoot + 'sys/departments/' + ancestor.id + '/';
                    return <span key={ancestor.id}>{' / '}<Link to={newHref}>{ancestor.name}</Link></span>;
                  })}
                  {groupID && <span>{' / '}{groupName}</span>}
                </h3>
              </div>
            </div>

            <ul className="nav border-bottom mx-4">
              {this.navItems.map((item, index) => {
                return (
                  <li className="nav-item mr-2" key={index}>
                    <Link to={`${siteRoot}sys/departments/${groupID}${item.urlPart}`} className={`nav-link ${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
                  </li>
                );
              })}
            </ul>
            {this.props.children}
          </div>
        </div>
      </Fragment>
    );
  }
}

Department.propTypes = DepartmentDetailPropTypes;

export default Department;
