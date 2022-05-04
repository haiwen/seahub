import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Input, Button } from 'reactstrap';
import { Utils } from '../utils/utils';
import { gettext } from '../utils/constants';
import { seafileAPI } from '../utils/seafile-api';
import Loading from './loading';
import GroupMembers from './group-members';

const propTypes = {
  groupID: PropTypes.string.isRequired,
  isOwner: PropTypes.bool.isRequired
};

class SearchGroupMembers extends React.Component {

  // pagination is not needed
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
      q: '', // query
      groupMembers: [],
      errMessage: [],
      isItemFreezed: false
    };
    this.isInit = true;
  }

  toggleItemFreezed = (isFreezed) => {
    this.setState({
      isItemFreezed: isFreezed
    });
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

  submit = () => {
    let { q } = this.state;
    q = q.trim();
    if (!q) {
      return;
    }
    this.setState({
      isLoading: true
    });
    seafileAPI.searchGroupMember(this.props.groupID, q).then((res) => {
      this.isInit = false;
      this.setState({
        isLoading: false,
        groupMembers: res.data,
        errorMsg: ''
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      this.setState({
        isLoading: false,
        errorMsg: errMessage
      });
    });
  }

  onInputChange = (e) => {
    this.setState({
      q: e.target.value
    });
  }

  onInputKeyDown = (e) => {
    if (e.key == 'Enter') {
      this.submit();
    }
  }

  render() {
    const { isLoading, q, errorMsg, groupMembers } = this.state;
    return (
      <Fragment>
        <div className="d-flex justifiy-content-between">
          <Input
            type="text"
            id="search-member"
            className="form-control search-members-input mr-2"
            value={q}
            onChange={this.onInputChange}
            onKeyDown={this.onInputKeyDown}
          />
          <Button type="button" color="secondary" className="flex-shrink-0" onClick={this.submit} disabled={!q.trim()}>{gettext('Submit')}</Button>
        </div>
        {errorMsg && <p className="error">{errorMsg}</p>}
        <div className="manage-members">
          {isLoading ? <Loading /> : (
            <Fragment>
              {groupMembers.length === 0 && !this.isInit && <div className="mx-2 my-4">{gettext('No members')}</div>}
              {groupMembers.length > 0 && (
                <GroupMembers
                  groupMembers={groupMembers}
                  changeMember={this.changeMember}
                  deleteMember={this.deleteMember}
                  groupID={this.props.groupID}
                  isOwner={this.props.isOwner}
                  isItemFreezed={this.state.isItemFreezed}
                  toggleItemFreezed={this.toggleItemFreezed}
                />
              )}
            </Fragment>
          )}
        </div>
      </Fragment>
    );
  }
}

SearchGroupMembers.propTypes = propTypes;

export default SearchGroupMembers;
