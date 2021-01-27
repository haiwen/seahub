import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Table } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import RoleEditor from '../select-editor/role-editor';
import UserSelect from '../user-select';
import toaster from '../toast';
import Loading from '../loading';

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
      isLoading: true, // first loading
      isLoadingMore: false,
      groupMembers: [],
      page: 1,
      perPage: 100,
      hasNextPage: false,
      selectedOption: null,
      errMessage: [],
      isItemFreezed: false
    };
  }

  componentDidMount() {
    this.listGroupMembers(this.state.page);
  }

  listGroupMembers = (page) => {
    const { groupID } = this.props;
    const { perPage, groupMembers } = this.state;
    seafileAPI.listGroupMembers(groupID, page, perPage).then((res) => {
      const members = res.data;
      this.setState({
        isLoading: false,
        isLoadingMore: false,
        page: page,
        hasNextPage: members.length < perPage ? false : true,
        groupMembers: groupMembers.concat(members) 
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.setState({
        isLoading: false,
        isLoadingMore: false,
        hasNextPage: false
      });
    });
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
      const newMembers = res.data.success;
      this.setState({
        groupMembers: [].concat(newMembers, this.state.groupMembers),
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

  toggleItemFreezed = (isFreezed) => {
    this.setState({
      isItemFreezed: isFreezed
    });
  }

  toggle = () => {
    this.props.toggleManageMembersDialog();
  }

  handleScroll = (event) => {
    // isLoadingMore: to avoid repeated request
    const { page, hasNextPage, isLoadingMore } = this.state;
    if (hasNextPage && !isLoadingMore) {
      const clientHeight = event.target.clientHeight;
      const scrollHeight = event.target.scrollHeight;
      const scrollTop    = event.target.scrollTop;
      const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
      if (isBottom) { // scroll to the bottom
        this.setState({isLoadingMore: true}, () => {
          this.listGroupMembers(page + 1); 
        }); 
      }   
    }   
  }

  changeMember = (targetMember) => {
    this.setState({
      groupMembers: this.state.groupMembers.map((item) => {
        if (item.email == targetMember.email) {
          item = targetMember;
        }
        return item;
      })
    });
  }

  deleteMember = (targetMember) => {
    const groupMembers = this.state.groupMembers;
    groupMembers.splice(groupMembers.indexOf(targetMember), 1);
    this.setState({
      groupMembers: groupMembers
    });
  }

  render() {
    const { isLoading, hasNextPage } = this.state;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext('Manage group members')}</ModalHeader>
        <ModalBody>
          <p>{gettext('Add group member')}</p>
          <div className='add-members'>
            <UserSelect
              placeholder={gettext('Select users...')}
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
          <div className="manage-members" onScroll={this.handleScroll}>
            {isLoading ? <Loading /> : (
              <Fragment>
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
                  this.state.groupMembers.map((item, index) => {
                    return (
                        <Member
                          key={index}
                          item={item}
                          changeMember={this.changeMember}
                          deleteMember={this.deleteMember}
                          groupID={this.props.groupID}
                          isOwner={this.props.isOwner}
                          isItemFreezed={this.state.isItemFreezed}
                          toggleItemFreezed={this.toggleItemFreezed}
                        />
                    );
                  })
                    }
                  </tbody>
                </Table>
                {hasNextPage && <Loading />}
              </Fragment>
            )}
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
  changeMember: PropTypes.func.isRequired,
  deleteMember: PropTypes.func.isRequired,
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
      this.props.changeMember(res.data);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteMember = () => {
    const { item } = this.props;
    seafileAPI.deleteGroupMember(this.props.groupID, item.email).then((res) => {
      this.props.deleteMember(item);
      toaster.success(gettext('Successfully deleted {name}.').replace('{name}', item.name));
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
              onClick={this.deleteMember}>
            </i>
          }
        </td>
      </tr>
    );
  }
}

Member.propTypes = MemberPropTypes;


export default ManageMembersDialog;
