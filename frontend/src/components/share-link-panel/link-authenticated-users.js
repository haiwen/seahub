import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button } from 'reactstrap';
import { shareLinkAPI } from '../../utils/share-link-api';
import { Utils } from '../../utils/utils';
import UserSelect from '../user-select';
import toaster from '../toast';
import BackIcon from '../../components/back-icon';
import EmptyTip from '../empty-tip';
import Loading from '../loading';
import Icon from '../icon';

class UserItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isOperationShow: false
    };
  }

  onMouseEnter = () => {
    this.setState({
      isHighlighted: true,
      isOperationShow: true
    });
  };

  onMouseLeave = () => {
    this.setState({
      isHighlighted: false,
      isOperationShow: false
    });
  };

  deleteItem = () => {
    const { item } = this.props;
    this.props.deleteItem(item.username);
  };

  render() {
    const { item } = this.props;
    const { isHighlighted } = this.state;
    return (
      <tr
        className={isHighlighted ? 'tr-highlight' : ''}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onFocus={this.onMouseEnter}
        tabIndex="0"
      >
        <td>
          <div className="d-flex align-items-center" title={item.contact_email}>
            <img src={item.avatar_url} width="24" alt={item.name} className="rounded-circle mr-2 cursor-pointer" />
            <span>{item.name}</span>
          </div>
        </td>
        <td>
          <span
            tabIndex="0"
            role="button"
            className={`op-icon ${this.state.isOperationShow ? '' : 'hide'}`}
            onClick={this.deleteItem}
            onKeyDown={Utils.onKeyDown}
            title={gettext('Delete')}
            aria-label={gettext('Delete')}
          >
            <Icon symbol="close" />
          </span>
        </td>
      </tr>
    );
  }
}

UserItem.propTypes = {
  repoID: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired,
  deleteItem: PropTypes.func.isRequired,
};

const propTypes = {
  repoID: PropTypes.string.isRequired,
  linkToken: PropTypes.string,
  setMode: PropTypes.func,
  path: PropTypes.string,
};

class LinkAuthenticatedUsers extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedUsers: [],
      authUsers: [],
      isLoading: true
    };
  }

  componentDidMount() {
    this.listLinkAuthUsers();
  }

  listLinkAuthUsers = () => {
    const { linkToken, path } = this.props;
    shareLinkAPI.listShareLinkAuthUsers(linkToken, path).then(res => {
      this.setState({
        authUsers: res.data.auth_list,
        isLoading: false
      });
    }).catch(error => {
      this.setState({ isLoading: false });
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  addLinkAuthUsers = () => {
    const { linkToken, path } = this.props;
    const { selectedUsers, authUsers } = this.state;
    if (!selectedUsers || !selectedUsers.length) {
      return false;
    }
    const users = selectedUsers.map((item, index) => item.email);
    shareLinkAPI.addShareLinkAuthUsers(linkToken, users, path).then(res => {
      const { success, failed } = res.data;
      if (success.length) {
        let newNames = success.map(item => item.name);
        let msg = gettext('Successfully added %s.').replace('%s', newNames.join(', '));
        toaster.success(msg);
      }
      if (failed.length) {
        failed.forEach(item => {
          let msg = `${item.name}: ${item.error_msg}`;
          toaster.danger(msg);
        });
      }
      this.setState({
        authUsers: success.concat(authUsers),
        selectedUsers: []
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  deleteItem = (username) => {
    const { linkToken, path } = this.props;
    let users = [username,];
    shareLinkAPI.deleteShareLinkAuthUsers(linkToken, users, path).then(res => {
      let authUsers = this.state.authUsers.filter(user => {
        return user.username !== username;
      });
      this.setState({
        authUsers: authUsers
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  goBack = () => {
    this.props.setMode('displayLinkDetails');
  };

  handleSelectChange = (option) => {
    this.setState({ selectedUsers: option });
  };

  render() {
    let { authUsers } = this.state;
    const thead = (
      <thead>
        <tr>
          <th width="82%"></th>
          <th width="18%"></th>
        </tr>
      </thead>
    );
    return (
      <div className="h-100 d-flex flex-column">
        <div className="d-flex align-items-center pb-2 border-bottom">
          <h6 className="font-weight-normal m-0">
            <BackIcon onClick={this.goBack} />
            {gettext('Authenticated users')}
          </h6>
        </div>
        <table className="table-thead-hidden w-xs-200">
          {thead}
          <tbody>
            <tr>
              <td>
                <UserSelect
                  isMulti={true}
                  placeholder={gettext('Search users')}
                  onSelectChange={this.handleSelectChange}
                  selectedUsers={this.state.selectedUsers}
                />
              </td>
              <td>
                <Button onClick={this.addLinkAuthUsers}>{gettext('Submit')}</Button>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="share-list-container flex-fill">
          {this.state.isLoading
            ? <Loading />
            : authUsers.length === 0
              ? <EmptyTip text={gettext('No items')} className="h-100 m-0" />
              : (
                <table className="table-thead-hidden w-xs-200">
                  {thead}
                  <tbody>
                    {authUsers.map((item, index) => {
                      return (
                        <UserItem
                          key={index}
                          item={item}
                          repoID={this.props.repoID}
                          deleteItem={this.deleteItem}
                        />
                      );
                    })}
                  </tbody>
                </table>
              )
          }
        </div>
      </div>
    );
  }
}

LinkAuthenticatedUsers.propTypes = propTypes;

export default LinkAuthenticatedUsers;
