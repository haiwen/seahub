import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import Icon from '../../icon';
import { Utils } from '../../../utils/utils';

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
  };

  handleMouseLeave = () => {
    this.setState({ highlight: false });
  };

  removeSelectedMember = () => {
    const { member } = this.props;
    this.props.removeSelectedMember(member.email);
  };

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
          <span
            className="op-icon"
            role="button"
            tabIndex="0"
            name={member.email}
            onClick={this.removeSelectedMember.bind(this, member.email)}>
            <Icon symbol="x-01" />
          </span>
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
        <div style={{ height: 'calc(100% - 70px)' }}>
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
          <Button color="secondary" onClick={this.props.toggle} onKeyDown={Utils.onKeyDown}>{gettext('Cancel')}</Button>
          {usedFor === 'add_group_member' &&
            <Button color="primary" onClick={this.props.addGroupMember} onKeyDown={Utils.onKeyDown}>{gettext('Add')}</Button>
          }
          {usedFor === 'add_user_share' &&
            <Button color="primary" onClick={this.props.addUserShares} onKeyDown={Utils.onKeyDown}>{gettext('Add')}</Button>
          }
        </ModalFooter>
      </div>
    );
  }
}

DepartmentGroupMemberSelected.propTypes = DepartmentGroupMemberSelectedPropTypes;

export default DepartmentGroupMemberSelected;
