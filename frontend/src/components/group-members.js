import React from 'react';
import PropTypes from 'prop-types';
import { Table } from 'reactstrap';
import { Utils } from '../utils/utils';
import { gettext } from '../utils/constants';
import { seafileAPI } from '../utils/seafile-api';
import RoleEditor from './select-editor/role-editor';
import toaster from './toast';
import OpIcon from './op-icon';

const propTypes = {
  groupMembers: PropTypes.array.isRequired,
  groupID: PropTypes.string.isRequired,
  isOwner: PropTypes.bool.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  toggleItemFreezed: PropTypes.func.isRequired,
  changeMember: PropTypes.func.isRequired,
  deleteMember: PropTypes.func.isRequired
};

class GroupMembers extends React.Component {

  render() {
    const { groupMembers, changeMember, deleteMember, groupID, isOwner, isItemFreezed, toggleItemFreezed } = this.props;
    return (
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
          {groupMembers.map((item, index) => {
            return (
              <Member
                key={index}
                item={item}
                changeMember={changeMember}
                deleteMember={deleteMember}
                groupID={groupID}
                isOwner={isOwner}
                isItemFreezed={isItemFreezed}
                toggleItemFreezed={toggleItemFreezed}
              />
            );
          })
          }
        </tbody>
      </Table>
    );
  }
}

GroupMembers.propTypes = propTypes;

const MemberPropTypes = {
  item: PropTypes.object.isRequired,
  changeMember: PropTypes.func.isRequired,
  deleteMember: PropTypes.func.isRequired,
  toggleItemFreezed: PropTypes.func.isRequired,
  groupID: PropTypes.string.isRequired,
  isOwner: PropTypes.bool.isRequired,
  isItemFreezed: PropTypes.bool.isRequired
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
      <tr onMouseOver={this.handleMouseOver} onMouseLeave={this.handleMouseLeave} className={this.state.highlight ? 'tr-highlight' : ''} tabIndex="0" onFocus={this.handleMouseOver}>
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
          {(deleteAuthority && this.state.highlight) &&
          <OpIcon
            className="action-icon sf2-icon-x3"
            title={gettext('Delete')}
            op={this.deleteMember}
          />
          }
        </td>
      </tr>
    );
  }
}

Member.propTypes = MemberPropTypes;


export default GroupMembers;
