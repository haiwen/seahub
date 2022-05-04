import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../utils/constants';
import moment from 'moment';
import { Button, Input } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api.js';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import Loading from '../loading';
import SharePermissionEditor from '../select-editor/share-permission-editor';
import '../../css/invitations.css';

class UserItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false
    };
  }

  onMouseEnter = () => {
    this.setState({ isOperationShow: true });
  }

  onMouseLeave = () => {
    this.setState({ isOperationShow: false });
  }

  deleteShareItem = () => {
    let item = this.props.item;
    this.props.deleteShareItem(item.token);
  }

  onChangeUserPermission = (permission) => {
    let item = this.props.item;
    this.props.onChangeUserPermission(item.token, permission);
  }

  render() {
    let item = this.props.item;
    let currentPermission = item.is_admin ? 'admin' : item.permission;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} tabIndex="0" onFocus={this.onMouseEnter}>
        <td className="name">{item.accepter}</td>
        <td>
          <SharePermissionEditor
            isTextMode={true}
            isEditIconShow={this.state.isOperationShow}
            currentPermission={currentPermission}
            permissions={this.props.permissions}
            onPermissionChanged={this.onChangeUserPermission}
          />
        </td>
        <td>{moment(item.expire_time).format('YYYY-MM-DD')}</td>
        <td className="name">{item.inviter_name}</td>
        <td>
          <span
            tabIndex="0"
            role="button"
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'hide'}`}
            onClick={this.deleteShareItem}
            onKeyDown={Utils.onKeyDown}
            title={gettext('Delete')}
            aria-label={gettext('Delete')}
          >
          </span>
        </td>
      </tr>
    );
  }
}

class UserList extends React.Component {

  render() {
    let items = this.props.items;
    return (
      <tbody>
        {items.map((item, index) => {
          return (
            <UserItem
              key={index}
              item={item}
              permissions={this.props.permissions}
              deleteShareItem={this.props.deleteShareItem}
              onChangeUserPermission={this.props.onChangeUserPermission}
            />
          );
        })}
      </tbody>
    );
  }
}

const propTypes = {
  itemPath: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
};

class ShareToInvitePeople extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      errorMsg: '',
      permission: 'r',
      sharedItems: [],
      emails: '',
      isSubmitting: false,
    };
    this.permissions = ['rw', 'r'];
  }

  handleInputChange = (e) => {
    let emails = e.target.value;
    this.setState({
      emails: emails,
    });
    if (this.state.errorMsg) {
      this.setState({
        errorMsg: '',
      });
    }
  }

  handleKeyDown = (e) => {
    if (e.keyCode === 13) {
      e.preventDefault();
      this.shareAndInvite();
    }
  }

  componentDidMount() {
    const path = this.props.itemPath;
    const repoID = this.props.repoID;
    seafileAPI.listRepoShareInvitations(repoID, path).then((res) => {
      if (res.data.length !== 0) {
        this.setState({ sharedItems: res.data.repo_share_invitation_list });
      }
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  setPermission = (permission) => {
    this.setState({ permission: permission });
  }

  onInvitePeople = (successArray) => {
    successArray.push.apply(successArray, this.state.sharedItems);
    this.setState({
      sharedItems: successArray,
    });
  }

  shareAndInvite = () => {
    let emails = this.state.emails.trim();
    if (!emails) {
      this.setState({ errorMsg: gettext('It is required.') });
      return false;
    }

    let emailsArray = [];
    emails = emails.split(',');
    for (let i = 0, len = emails.length; i < len; i++) {
      let email = emails[i].trim();
      if (email) {
        emailsArray.push(email);
      }
    }

    if (!emailsArray.length) {
      this.setState({ errorMsg: gettext('Email is invalid.') });
      return false;
    }

    this.setState({ isSubmitting: true });

    const path = this.props.itemPath;
    const repoID = this.props.repoID;
    const permission = this.state.permission;

    seafileAPI.addRepoShareInvitations(repoID, path, emailsArray, permission).then((res) => {
      const success = res.data.success;
      if (success.length) {
        let successMsg = '';
        if (success.length == 1) {
          successMsg = gettext('Successfully invited %(email).')
            .replace('%(email)', success[0].accepter);
        } else {
          successMsg = gettext('Successfully invited %(email) and %(num) other people.')
            .replace('%(email)', success[0].accepter)
            .replace('%(num)', success.length - 1);
        }
        toaster.success(successMsg);
        this.onInvitePeople(success);
      }
      const failed = res.data.failed;
      if (failed.length) {
        for (let i = 0, len = failed.length; i < len; i++) {
          let failedMsg = failed[i].email + ': ' + failed[i].error_msg;
          toaster.danger(failedMsg);
        }
      }
      this.setState({ isSubmitting: false });
    }).catch((error) => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      this.setState({ isSubmitting: false });
    });
  }

  deleteShareItem = (token) => {
    const path = this.props.itemPath;
    const repoID = this.props.repoID;

    seafileAPI.deleteRepoShareInvitation(repoID, path, token).then(res => {
      this.setState({
        sharedItems: this.state.sharedItems.filter(item => { return item.token !== token; })
      });
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onChangeUserPermission = (token, permission) => {
    const path = this.props.itemPath;
    const repoID = this.props.repoID;

    seafileAPI.updateRepoShareInvitation(repoID, path, token, permission).then(() => {
      this.updateSharedItems(token, permission);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  updateSharedItems = (token, permission) => {
    let sharedItems = this.state.sharedItems.map(sharedItem => {
      if (sharedItem.token === token) {
        sharedItem.permission = permission;
      }
      return sharedItem;
    });
    this.setState({ sharedItems: sharedItems });
  }

  render() {
    let { sharedItems, isSubmitting } = this.state;
    return (
      <Fragment>
        <table className="table-thead-hidden w-xs-200">
          <thead>
            <tr>
              <th width="50%">{gettext('Invite Guest')}</th>
              <th width="35%">{gettext('Permission')}</th>
              <th width="15%">{''}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Input
                  type="text"
                  id="emails"
                  placeholder={gettext('Emails, separated by \',\'')}
                  value={this.state.emails}
                  onChange={this.handleInputChange}
                  onKeyDown={this.handleKeyDown}
                />
              </td>
              <td>
                <SharePermissionEditor
                  isTextMode={false}
                  isEditIconShow={false}
                  currentPermission={this.state.permission}
                  permissions={this.permissions}
                  onPermissionChanged={this.setPermission}
                />
              </td>
              <td>
                <Button onClick={this.shareAndInvite} disabled={isSubmitting}
                >{isSubmitting ? <Loading /> : gettext('Submit')}</Button>
              </td>
            </tr>
            {this.state.errorMsg.length > 0 &&
            <tr key={'error'}>
              <td colSpan={3}><p className="error">{this.state.errorMsg}</p></td>
            </tr>
            }
          </tbody>
        </table>
        <div className="share-list-container">
          <table className="w-xs-200">
            <thead>
              <tr>
                <th width="25%">{gettext('Email')}</th>
                <th width="20%">{gettext('Permission')}</th>
                <th width="20%">{gettext('Expiration')}</th>
                <th width="20%">{gettext('Inviter')}</th>
                <th width="15%">{''}</th>
              </tr>
            </thead>
            <UserList
              items={sharedItems}
              permissions={this.permissions}
              deleteShareItem={this.deleteShareItem}
              onChangeUserPermission={this.onChangeUserPermission}
            />
          </table>
        </div>
      </Fragment>
    );
  }
}

ShareToInvitePeople.propTypes = propTypes;

export default ShareToInvitePeople;
