import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Table } from 'reactstrap';
import { siteRoot } from '../../../utils/constants';
import Loading from '../../../components/loading';

const WorkWeixinDepartmentMembersListPropTypes = {
  isMembersListLoading: PropTypes.bool.isRequired,
  membersList: PropTypes.array.isRequired,
  newUsersTempObj: PropTypes.object.isRequired,
  checkedDepartmentId: PropTypes.number.isRequired,
  onUserChecked: PropTypes.func.isRequired,
  onAllUsersChecked: PropTypes.func.isRequired,
  isCheckedAll: PropTypes.bool.isRequired,
  canCheckUserIds: PropTypes.array.isRequired,
};

class WorkWeixinDepartmentMembersList extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { newUsersTempObj, checkedDepartmentId, isMembersListLoading, canCheckUserIds } = this.props;
    const membersList = this.props.membersList.map((member, index) => {
      let avatar = member.avatar;
      if (member.avatar && member.avatar.length > 0) {
        avatar = member.avatar.substring(0, member.avatar.length - 1) + '100';// get smaller avatar
      } else {
        avatar = siteRoot + 'media/avatars/default.png';
      }
      return (
        <tr key={checkedDepartmentId.toString() + member.userid}>
          <td>
            {!member.email &&
              <input type="checkbox" className="vam" onChange={() => this.props.onUserChecked(member)}
                checked={(member.userid in newUsersTempObj) ? 'checked' : ''}></input>}
          </td>
          <td><img className="avatar" src={avatar} alt=""></img></td>
          <td>{member.name}</td>
          <td>{member.mobile}</td>
          <td>{member.contact_email}</td>
          <td>{member.email && <i className="sf2-icon-tick"></i>}</td>
        </tr>
      );
    });

    return (
      <div className="dir-content-main">
        {isMembersListLoading && <Loading/>}
        {!isMembersListLoading && this.props.membersList.length > 0 &&
          <Table hover>
            <thead>
              <tr>
                <th width="5%">
                  {canCheckUserIds.length > 0 &&
                    <input type="checkbox" className="vam" checked={this.props.isCheckedAll}
                      onChange={() => this.props.onAllUsersChecked()}></input>}
                </th>
                <th width="10%"></th>
                <th width="20%">{'名称'}</th>
                <th width="20%">{'手机号'}</th>
                <th width="30%">{'邮箱'}</th>
                <th width="15%">{'已添加'}</th>
              </tr>
            </thead>
            <tbody>{membersList}</tbody>
          </Table>
        }
        {!isMembersListLoading && this.props.membersList.length === 0 &&
          <div className="message empty-tip text-center">
            <img src={`${siteRoot}media/img/member-list-empty-2x.png`} alt=""/>
            <h4>{'成员列表为空'}</h4>
          </div>
        }
      </div>
    );
  }
}

WorkWeixinDepartmentMembersList.propTypes = WorkWeixinDepartmentMembersListPropTypes;

export default WorkWeixinDepartmentMembersList;
