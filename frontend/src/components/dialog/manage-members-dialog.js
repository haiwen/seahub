import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Table } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import RoleEditor from '../select-editor/role-editor';
import UserSelect from '../user-select.js';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import '../../css/manage-members-dialog.css';

const propTypes = {
  groupID: PropTypes.string.isRequired,
  toggleManageMembersDialog: PropTypes.func.isRequired,
  onGroupChanged: PropTypes.func.isRequired,
  isOwner: PropTypes.bool.isRequired,
};

class ManageMembersDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groupMembers: [],
      selectedOption: null,
      errMessage: [],
      isItemFreezed: false,
    };
  }

  onSelectChange = (option) => {
    this.setState({
      selectedOption: option,
      errMessage: [],
    });
  }

  addGroupMember = () => {
    let emails = [];
    for (let i = 0; i < this.state.selectedOption.length; i++) {
      emails.push(this.state.selectedOption[i].email);
    }
    seafileAPI.addGroupMembers(this.props.groupID, emails).then((res) => {
      this.onGroupMembersChange();
      this.setState({
        selectedOption: null,
      });
      this.refs.userSelect.clearSelect();
      if (res.data.failed.length > 0) {
        this.setState({
          errMessage: res.data.failed
        });
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  listGroupMembers = () => {
    seafileAPI.listGroupMembers(this.props.groupID).then((res) => {
      this.setState({
        groupMembers: res.data
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onGroupMembersChange = () => {
    this.listGroupMembers();
  }

  toggleItemFreezed = (isFreezed) => {
    this.setState({
      isItemFreezed: isFreezed
    });
  }

  toggle = () => {
    this.props.toggleManageMembersDialog();
  }

  componentDidMount() {
    this.listGroupMembers();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Manage group members')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Add group member')}</p>
          <div className='add-members'>
            <UserSelect
              placeholder={gettext('Search users...')}
              onSelectChange={this.onSelectChange}
              ref="userSelect"
              isMulti={true}
              className="add-members-select"
            />
            {this.state.selectedOption ?
              <Button color="secondary" onClick={this.addGroupMember}>{gettext('Submit')}</Button> :
              <Button color="secondary" disabled>{gettext('Submit')}</Button>
            }
          </div>
          {
            this.state.errMessage.length > 0 &&
            this.state.errMessage.map((item, index = 0) => {
              return (
                <div className="group-error error" key={index}>{item.error_msg}</div>
              );
            })
          }
          <div className="manage-members">
            <Table size="sm" className="manage-members-table">
              <thead>
                <tr>
                  <th width="15%"></th>
                  <th width="45%">{gettext('Name')}</th>
                  <th width="30%">{gettext('Role')}</th>
                  <th width="10%"></th>
                </tr>
              </thead>
              <tbody>
                {
                  this.state.groupMembers.length > 0 &&
                  this.state.groupMembers.map((item, index = 0) => {
                    return (
                      <React.Fragment key={index}>
                        <Member
                          item={item}
                          onGroupMembersChange={this.onGroupMembersChange}
                          groupID={this.props.groupID}
                          isOwner={this.props.isOwner}
                          isItemFreezed={this.state.isItemFreezed}
                          toggleItemFreezed={this.toggleItemFreezed}
                        />
                      </React.Fragment>
                    );
                  })
                }
              </tbody>
            </Table>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ManageMembersDialog.propTypes = propTypes;

const MemberPropTypes = {
  item: PropTypes.object.isRequired,
  onGroupMembersChange: PropTypes.func.isRequired,
  groupID: PropTypes.string.isRequired,
  isOwner: PropTypes.bool.isRequired,
};

class Member extends React.PureComponent {

  constructor(props) {
    super(props);
    this.roles = ['Admin', 'Member'];
    this.state = ({
      highlight: false,
    });
  }

  onChangeUserRole = (role) => {
    let isAdmin = role === 'Admin' ? 'True' : 'False';
    seafileAPI.setGroupAdmin(this.props.groupID, this.props.item.email, isAdmin).then((res) => {
      this.props.onGroupMembersChange();
    });
    this.setState({
      highlight: false,
    });
  }

  deleteMember = (name) => {
    seafileAPI.deleteGroupMember(this.props.groupID, name).then((res) => {
      this.props.onGroupMembersChange();
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  handleMouseOver = () => {
    if (this.props.isItemFreezed) return;
    this.setState({
      highlight: true,
    });
  }

  handleMouseLeave = () => {
    if (this.props.isItemFreezed) return;
    this.setState({
      highlight: false,
    });
  }

  translateRole = (role) => {
    if (role === 'Admin') {
      return gettext('Admin');
    }  
    else if (role === 'Member') {
      return gettext('Member');
    }
    else if (role === 'Owner') {
      return gettext('Owner');
    }
  }

  render() {
    const { item, isOwner } = this.props;
    const deleteAuthority = (item.role !== 'Owner' && isOwner === true) || (item.role === 'Member' && isOwner === false);
    return(
      <tr onMouseOver={this.handleMouseOver} onMouseLeave={this.handleMouseLeave} className={this.state.highlight ? 'editing' : ''}>
        <th scope="row"><img className="avatar" src={item.avatar_url} alt=""/></th>
        <td>{item.name}</td>
        <td>
          {((isOwner === false) || (isOwner === true && item.role === 'Owner')) && 
            <span className="group-admin">{this.translateRole(item.role)}</span>
          }
          {(isOwner === true && item.role !== 'Owner') &&
            <RoleEditor 
              isTextMode={true}
              isEditIconShow={this.state.highlight}
              currentRole={item.role}
              roles={this.roles}
              onRoleChanged={this.onChangeUserRole}
              toggleItemFreezed={this.props.toggleItemFreezed}
            />
          }
        </td>
        <td>
          {(deleteAuthority && !this.props.isItemFreezed) &&
            <i
              className="fa fa-times delete-group-member-icon"
              name={item.email}
              onClick={this.deleteMember.bind(this, item.email)}>
            </i>
          }
        </td>
      </tr>
    );
  }
}

Member.propTypes = MemberPropTypes;


export default ManageMembersDialog;
