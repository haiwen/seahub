import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'reactstrap';
import { gettext, mediaUrl } from '../../../utils/constants';
import EmptyTip from '../../empty-tip';
import Loading from '../../loading';
import Icon from '../../icon';

const ItemPropTypes = {
  member: PropTypes.object,
  index: PropTypes.number,
  tip: PropTypes.string,
  memberSelected: PropTypes.object,
  isMemberSelected: PropTypes.bool,
  onUserChecked: PropTypes.func.isRequired,
};

class Item extends Component {
  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      tooltipOpen: false,
    };
  }

  handleMouseEnter = () => {
    this.setState({ highlight: true });
  };

  handleMouseLeave = () => {
    this.setState({ highlight: false });
  };

  onChange = (e) => {
    const { member } = this.props;
    this.props.onUserChecked(member);
  };

  toggleTooltip = () => {
    this.setState({ tooltipOpen: !this.state.tooltipOpen });
  };

  render() {
    const { member, memberSelected, isMemberSelected, index, tip } = this.props;
    if (isMemberSelected) {
      return (
        <tr
          className={this.state.highlight ? 'tr-highlight group-item' : 'group-item'}
          onMouseEnter={this.handleMouseEnter}
          onMouseLeave={this.handleMouseLeave}
        >
          <td width="13%">
            <input type="checkbox" className="vam" checked='checked' disabled/>
          </td>
          <td width="12%"><img className="avatar" src={member.avatar_url} alt=""/></td>
          <td width="60%">{member.name}</td>
          <td width="15%" className={this.state.highlight ? 'visible' : 'invisible' } id={`no-select-${index}`}>
            <span className="d-inline-flex align-items-center">
              <Icon symbol="about" />
            </span>
            <Tooltip placement='bottom' isOpen={this.state.tooltipOpen} toggle={this.toggleTooltip} target={`no-select-${index}`} delay={{ show: 0, hide: 0 }} fade={false}>
              {tip}
            </Tooltip>
          </td>
        </tr>
      );
    }
    return (
      <tr
        className={this.state.highlight ? 'tr-highlight group-item' : 'group-item'}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      >
        <td width="13%">
          <input
            type="checkbox"
            className="vam"
            onChange={this.onChange}
            checked={(member.email in memberSelected) ? 'checked' : ''}
          />
        </td>
        <td width="11%"><img className="avatar" src={member.avatar_url} alt=""/></td>
        <td width="76%">{member.name}</td>
      </tr>
    );
  }
}

Item.propTypes = ItemPropTypes;


const DepartmentGroupMembersPropTypes = {
  members: PropTypes.array.isRequired,
  memberSelected: PropTypes.object.isRequired,
  onUserChecked: PropTypes.func.isRequired,
  currentDepartment: PropTypes.object.isRequired,
  selectedMemberMap: PropTypes.object,
  selectAll: PropTypes.func.isRequired,
  unselectAll: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  usedFor: PropTypes.oneOf(['add_group_member', 'add_user_share']),
  keyword: PropTypes.string,
  searching: PropTypes.bool,
  usersFound: PropTypes.array
};

class DepartmentGroupMembers extends Component {

  render() {
    const { members, memberSelected, loading, selectedMemberMap, currentDepartment, usedFor, keyword, searching, usersFound } = this.props;
    let headerTitle = (currentDepartment.name || '') + ' ' + gettext('members');
    if (loading || searching) {
      return (
        <div className="department-dialog-member pt-4">
          <div className="w-100">
            <div className='department-dialog-member-head px-4 mt-4'>
              <Loading />
            </div>
          </div>
        </div>
      );
    }

    const itemsShown = keyword ? usersFound : members;
    const unselectedItems = itemsShown.filter(item => !(item.email in memberSelected) && !selectedMemberMap[item.email]);
    const addedItems = itemsShown.filter(item => selectedMemberMap[item.email]);

    const tip = usedFor === 'add_group_member' ? gettext('User is already in this group') : gettext('It is already shared to user');
    return (
      <div className="department-dialog-member pt-4">
        <div className="w-100">
          <div className='department-dialog-member-head px-4'>
            <div className='department-name'>
              {keyword ? gettext('Search results') : headerTitle}
            </div>
            {itemsShown.length > 0 && (
              <>
                {unselectedItems.length > 0
                  ? <div className='select-all' onClick={this.props.selectAll}>{gettext('Select all')}</div>
                  : itemsShown.length > addedItems.length
                    ? <div className='select-all' onClick={this.props.unselectAll}>{gettext('Unselect all')}</div>
                    : ''
                }
              </>
            )}
          </div>
          {itemsShown.length > 0 ?
            <Fragment>
              <table className="department-dialog-member-table">
                <tbody>
                  {itemsShown.map((member, index) => {
                    return (
                      <Item
                        key={index}
                        index={index}
                        member={member}
                        tip={tip}
                        memberSelected={memberSelected}
                        onUserChecked={this.props.onUserChecked}
                        isMemberSelected={selectedMemberMap[member.email]}
                      />
                    );
                  })}
                </tbody>
              </table>
            </Fragment>
            :
            <EmptyTip tipSrc={`${mediaUrl}img/no-users-tip.png`}>
              <h2>{keyword ? gettext('No users found') : gettext('No members')}</h2>
            </EmptyTip>
          }
        </div>
      </div>
    );
  }
}

DepartmentGroupMembers.propTypes = DepartmentGroupMembersPropTypes;

export default DepartmentGroupMembers;
