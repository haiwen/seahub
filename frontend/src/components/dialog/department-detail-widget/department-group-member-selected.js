import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';

const ItemPropTypes = {
  member: PropTypes.object,
  removeSelectedMember: PropTypes.func
};

class Item extends Component {
  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
    };
  }

  handleMouseEnter = () => {
    this.setState({ highlight: true });
  }

  handleMouseLeave = () => {
    this.setState({ highlight: false });
  }

  removeSelectedMember = (email) => {
    this.props.removeSelectedMember(email);
  }

  render() {
    const { member } = this.props;
    return (
      <tr
        className={this.state.highlight ? 'tr-highlight group-item' : 'group-item'}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      >
        <td width="17%"><img className="avatar" src={member.avatar_url} alt=""/></td>
        <td width="78%">{member.name}</td>
        <td width="10%">
          <i
            className="dtable-font dtable-icon-cancel"
            name={member.email}
            onClick={this.removeSelectedMember.bind(this, member.email)}>
          </i>
        </td>
      </tr>
    );
  }
}

Item.propTypes = ItemPropTypes;


const DepartmentGroupMemberSelectedPropTypes = {
  members: PropTypes.object.isRequired,
  removeSelectedMember: PropTypes.func.isRequired,
  addGroupMember: PropTypes.func.isRequired,
  toggle: PropTypes.func.isRequired,
  usedFor: PropTypes.string,
  addUserShares: PropTypes.func,
};

class DepartmentGroupMemberSelected extends Component {

  render() {
    const { members, usedFor } = this.props;
    return (
      <div className="department-dialog-member-selected pt-4">
        <div style={{height: 'calc(100% - 70px)'}}>
          <div className='department-dialog-member-head px-4'>
            <div className='department-name'>{gettext('Selected')}</div>
          </div>
          {Object.keys(members).length > 0 &&
            <table className="department-dialog-member-table">
              <tbody>
                {Object.keys(members).map((email, index) => {
                  return (
                    <Item
                      key={index}
                      member={members[email]}
                      removeSelectedMember={this.props.removeSelectedMember}
                    />
                  );
                })}
              </tbody>
            </table>
          }
        </div>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          {usedFor === 'add_group_member' &&
            <Button color="primary" onClick={this.props.addGroupMember}>{gettext('Add')}</Button>
          }
          {usedFor === 'add_user_share' &&
            <Button color="primary" onClick={this.props.addUserShares}>{gettext('Add')}</Button>
          }
        </ModalFooter>
      </div>
    );
  }
}

DepartmentGroupMemberSelected.propTypes = DepartmentGroupMemberSelectedPropTypes;

export default DepartmentGroupMemberSelected;
