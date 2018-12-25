import React from 'react';
import AsyncSelect from 'react-select/lib/Async';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Table } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
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
        this.listGroupMembers();
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

  deleteMember = (name) => {
    seafileAPI.deleteGroupMember(this.props.groupID, name).then((res) => {
      this.listGroupMembers();
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
                      <tr key={index} >
                        <th scope="row"><img className="avatar" src={item.avatar_url} alt=""/></th>
                        <td>{item.name}</td>
                        <td>
                          {
                            ((this.props.isOwner === false) || (this.props.isOwner === true && item.role === 'Owner')) && 
                            <span className="group-admin">{item.role}</span>
                          }
                          {
                            (this.props.isOwner === true && item.role !== 'Owner') &&
                            <ChangeMemberAdmin
                              item={item}
                              listGroupMembers={this.listGroupMembers}
                              groupID={this.props.groupID}
                              isOwner={this.props.isOwner}
                            />
                          }
                        </td>
                        <td>
                          {
                            ((item.role !== 'Owner' && this.props.isOwner === true) ||
                            (item.role === 'Member' && this.props.isOwner === false)) &&
                            <i
                              className="fa fa-times delete-group-member-icon"
                              name={item.email}
                              onClick={this.deleteMember.bind(this, item.email)}>
                            </i>
                          }
                        </td>
                      </tr>
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

const ChangeMemberAdminPropTypes = {
  item: PropTypes.object,
  listGroupMembers: PropTypes.func.isRequired,
  groupID: PropTypes.string.isRequired,
  isOwner: PropTypes.bool.isRequired,
};

class ChangeMemberAdmin extends React.PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      changeAdmin: false
    };
  }

  toggleGroupAdmin = () => {
    this.setState({
      changeAdmin: !this.state.changeAdmin
    });
  }

  setGroupAdmin = (e) => {
    const isAdmin = e.target.value.indexOf('admin') > -1 ? 'true' : 'false';
    const userName = e.target.value.split('-', 2)[1];
    seafileAPI.setGroupAdmin(this.props.groupID, userName, isAdmin).then((res) => {
      this.props.listGroupMembers();
      this.setState({
        changeAdmin: false
      });
    });
  }

  render() {
    const item = this.props.item;
    const value = item.email;
    let options = item.role === 'Member' ?
      (<React.Fragment>
        <option value={`member-${value}`}>{gettext('Member')}</option>
        <option value={`admin-${value}`}>{gettext('Admin')}</option>
      </React.Fragment>):
      (<React.Fragment>
        <option value={`admin-${value}`}>{gettext('Admin')}</option>
        <option value={`member-${value}`}>{gettext('Member')}</option>
      </React.Fragment>);
    let admin = this.state.changeAdmin ? 
      (<select className="custom-select-sm" onChange={this.setGroupAdmin}>{options}</select>) :
      (<span className="group-admin">{item.role}
        <i className="fa fa-pencil toggle-group-admin-icon" onClick={this.toggleGroupAdmin}></i>
      </span>);
    return(
      admin
    );
  }
}

ChangeMemberAdmin.propTypes = ChangeMemberAdminPropTypes;


export default ManageMembersDialog;
