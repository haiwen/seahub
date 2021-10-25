import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { Utils } from '../utils/utils';
import { gettext } from '../utils/constants';
import { seafileAPI } from '../utils/seafile-api';
import UserSelect from './user-select';
import toaster from './toast';
import Loading from './loading';
import GroupMembers from './group-members';

const propTypes = {
  groupID: PropTypes.string.isRequired,
  isOwner: PropTypes.bool.isRequired,
  changeMode: PropTypes.func.isRequired
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
    const { isLoading, hasNextPage, groupMembers } = this.state;
    return (
      <Fragment>
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
        {groupMembers.length > 10 &&
          <div className="d-flex justify-content-end">
            <button className="btn btn-link px-0" onClick={this.props.changeMode}>{gettext('Search group members')}</button>
          </div>
        }
        <div className="manage-members" onScroll={this.handleScroll}>
          {isLoading ? <Loading /> : (
            <Fragment>
              <GroupMembers
                groupMembers={groupMembers}
                changeMember={this.changeMember}
                deleteMember={this.deleteMember}
                groupID={this.props.groupID}
                isOwner={this.props.isOwner}
                isItemFreezed={this.state.isItemFreezed}
                toggleItemFreezed={this.toggleItemFreezed}
              />
              {hasNextPage && <Loading />}
            </Fragment>
          )}
        </div>
      </Fragment>
    );
  }
}

ManageMembersDialog.propTypes = propTypes;

export default ManageMembersDialog;
