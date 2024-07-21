import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Link } from '@gatsbyjs/reach-router';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import MainPanelTopbar from '../main-panel-topbar';
import ModalPortal from '../../../components/modal-portal';
import AddDepartDialog from '../../../components/dialog/org-add-department-dialog';
import AddMemberDialog from '../../../components/dialog/org-add-member-dialog';
import AddRepoDialog from '../../../components/dialog/org-add-repo-dialog';
import { siteRoot, gettext, orgID, lang } from '../../../utils/constants';
import '../../../css/org-department-item.css';

moment.locale(lang);

class OrgDepartmentItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groupName: '',
      isItemFreezed: false,
      isDepartFreezed: false,
      ancestorGroups: [],
      members: [],
      deletedMember: {},
      isShowAddMemberDialog: false,
      showDeleteMemberDialog: false,
      repos: [],
      deletedRepo: {},
      isShowAddRepoDialog: false,
      showDeleteRepoDialog: false,
      groups: [],
      subGroupID: '',
      subGroupName: '',
      isShowAddDepartDialog: false,
    };

    this.navItems = [
      { name: 'subDepartments', urlPart: '/', text: gettext('Sub-departments') },
      { name: 'members', urlPart: '/members/', text: gettext('Members') },
      { name: 'repos', urlPart: '/libraries/', text: gettext('Libraries') }
    ];
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
    seafileAPI.orgAdminListGroupInfo(orgID, groupID, true).then(res => {
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

  toggleAddRepoDialog = () => {
    this.setState({ isShowAddRepoDialog: !this.state.isShowAddRepoDialog });
  };

  toggleAddMemberDialog = () => {
    this.setState({ isShowAddMemberDialog: !this.state.isShowAddMemberDialog });
  };

  toggleAddDepartDialog = () => {
    this.setState({ isShowAddDepartDialog: !this.state.isShowAddDepartDialog });
  };

  render() {
    const { groupID, currentItem } = this.props;
    const topBtn = 'btn btn-secondary operation-item';
    const topbarChildren = (
      <Fragment>
        {groupID && (
          <>
            {currentItem == 'subDepartments' &&
            <button className={topBtn} title={gettext('New Sub-department')} onClick={this.toggleAddDepartDialog}>{gettext('New Sub-department')}</button>
            }
            {currentItem == 'members' &&
            <button className={topBtn} title={gettext('Add Member')} onClick={this.toggleAddMemberDialog}>{gettext('Add Member')}</button>
            }
            {currentItem == 'repos' &&
            <button className={topBtn} onClick={this.toggleAddRepoDialog} title={gettext('New Library')}>{gettext('New Library')}</button>
            }
          </>
        )
        }
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
        {this.state.isShowAddDepartDialog && (
          <ModalPortal>
            <AddDepartDialog
              onAddNewDepartment={this.props.onAddNewDepartment}
              parentGroupID={groupID}
              toggle={this.toggleAddDepartDialog}
            />
          </ModalPortal>
        )}
      </Fragment>
    );

    return (
      <Fragment>
        <MainPanelTopbar children={topbarChildren} />
        <div className="main-panel-center flex-row h-100">
          <div className="cur-view-container o-auto">
            <div className="cur-view-path">
              <div className="fleft">
                <h3 className="sf-heading">
                  {groupID ?
                    <Link to={siteRoot + 'org/departmentadmin/'}>{gettext('Departments')}</Link>
                    : <span>{gettext('Departments')}</span>
                  }
                  {this.state.ancestorGroups.map(ancestor => {
                    let newHref = siteRoot + 'org/departmentadmin/groups/' + ancestor.id + '/';
                    return <span key={ancestor.id}>{' / '}<Link to={newHref}>{ancestor.name}</Link></span>;
                  })}
                  {groupID && <span>{' / '}{this.state.groupName}</span>}
                </h3>
              </div>
            </div>

            <ul className="nav border-bottom mx-4">
              {this.navItems.map((item, index) => {
                return (
                  <li className="nav-item mr-2" key={index}>
                    <Link to={`${siteRoot}org/departmentadmin/groups/${groupID}${item.urlPart}`} className={`nav-link ${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
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

const OrgDepartmentItemPropTypes = {
  groupID: PropTypes.string,
  currentItem: PropTypes.string.isRequired,
  onAddNewDepartment: PropTypes.func,
  onAddNewMembers: PropTypes.func,
  onAddNewRepo: PropTypes.func,
  children: PropTypes.object
};

OrgDepartmentItem.propTypes = OrgDepartmentItemPropTypes;

export default OrgDepartmentItem;
