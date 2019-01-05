import React from 'react';
import AsyncSelect from 'react-select/lib/Async';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Table } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import PermissionEditor from '../permission-editor';
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
      errMessage: '',
    };
    this.options = [];
  }

  handleSelectChange = (option) => {
    this.setState({
      selectedOption: option,
      errMessage: '',
    });
    this.options = [];
  }

  loadOptions = (value, callback) => {
    if (value.trim().length > 0) {
      seafileAPI.searchUsers(value.trim()).then((res) => {
        this.options = [];
        for (let i = 0 ; i < res.data.users.length; i++) {
          let obj = {};
          obj.value = res.data.users[i].name;
          obj.email = res.data.users[i].email;
          obj.label =
            <React.Fragment>
              <img src={res.data.users[i].avatar_url} className="avatar" alt=""/>
              <span className="transfer-group-name">{res.data.users[i].name}</span>
            </React.Fragment>;
          this.options.push(obj);
        }
        callback(this.options);
      });
    }
  }

  addGroupMember = () => {
    if (this.state.selectedOption && this.state.selectedOption.email) {
      this.refs.memberSelect.select.onChange([], { action: 'clear' });
      seafileAPI.addGroupMember(this.props.groupID, this.state.selectedOption.email).then((res) => {
        this.onGroupMembersChange();
        this.options = [];
        this.setState({
          selectedOption: null,
        });
      }).catch((error) => {
        if (error.response) {
          this.setState({
            errMessage: error.response.data.error_msg
          });
        }
      });
    }
  }

  listGroupMembers = () => {
    seafileAPI.listGroupMembers(this.props.groupID).then((res) => {
      this.setState({
        groupMembers: res.data
      });
    });
  }

  onGroupMembersChange = () => {
    this.listGroupMembers();
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
          <div className='group-transfer'>
            <AsyncSelect
              className='group-transfer-select'
              isClearable classNamePrefix
              loadOptions={this.loadOptions}
              onChange={this.handleSelectChange}
              placeholder={gettext('Search users...')}
              ref="memberSelect"
            />
            <Button color="secondary" onClick={this.addGroupMember}>{gettext('Submit')}</Button>
          </div>
          <span className="error">{this.state.errMessage}</span>
          <div className="manage-members">
            <Table hover size="sm" className="manage-members-table">
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
  }

  onChangeUserPermission = (permission) => {
    let isAdmin = permission === 'Admin' ? 'True' : 'False';
    seafileAPI.setGroupAdmin(this.props.groupID, this.props.item.email, isAdmin).then((res) => {
      this.props.onGroupMembersChange();
    });
  }

  deleteMember = (name) => {
    seafileAPI.deleteGroupMember(this.props.groupID, name).then((res) => {
      this.props.onGroupMembersChange();
    });
  }

  render() {
    const { item, isOwner } = this.props;
    const permissions = ['Admin', 'Member'];
    return(
      <tr>
        <th scope="row"><img className="avatar" src={item.avatar_url} alt=""/></th>
        <td>{item.name}</td>
        <td>
          {((isOwner === false) || (isOwner === true && item.role === 'Owner')) && 
            <span className="group-admin">{item.role}</span>
          }
          {(isOwner === true && item.role !== 'Owner') &&
            <PermissionEditor 
              isTextMode={true}
              isEditIconShow={true}
              currentPermission={this.props.item.role}
              permissions={permissions}
              onPermissionChangedHandler={this.onChangeUserPermission}
            />
          }
        </td>
        <td>
          {((item.role !== 'Owner' && isOwner === true) || (item.role === 'Member' && isOwner === false)) &&
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
