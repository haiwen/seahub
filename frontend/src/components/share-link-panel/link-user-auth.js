import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button } from 'reactstrap';
import { Utils } from '../../utils/utils';
import UserSelect from '../user-select';
import '../../css/invitations.css';

import '../../css/share-to-user.css';
import { shareLinkAPI } from '../../utils/share-link-api';

class UserItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false,
    };
  }

  onMouseEnter = () => {
    this.setState({isOperationShow: true});
  };

  onMouseLeave = () => {
    this.setState({isOperationShow: false});
  };

  deleteItem = () => {
    const { item } = this.props;
    this.props.deleteItem(item.username);

  };

  render() {
    let item = this.props.item;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} tabIndex="0" onFocus={this.onMouseEnter}>
        <td className="name">
          <div className="position-relative" title={item.contact_email}>
            <img src={item.avatar_url}
              width="24" alt={item.name}
              className="rounded-circle mr-2 cursor-pointer"
            />
            <span>{item.name}</span>
          </div>
        </td>
        <td>
          <span
            tabIndex="0"
            role="button"
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'hide'}`}
            onClick={this.deleteItem}
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

UserItem.propTypes = {
  repoID: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired,
  deleteItem: PropTypes.func.isRequired,
};

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
              repoID={this.props.repoID}
              deleteItem={this.props.deleteItem}
            />
          );
        })}
      </tbody>
    );
  }
}

UserList.propTypes = {
  repoID: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  linkToken: PropTypes.string,
  deleteItem: PropTypes.func,
};

const propTypes = {
  repoID: PropTypes.string.isRequired,
  linkToken: PropTypes.string,
  setMode: PropTypes.func,
  path: PropTypes.string,
  hideHead: PropTypes.bool
};

class LinkUserAuth extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      authUsers: []
    };
  }

  handleSelectChange = (option) => {
    this.setState({selectedOption: option});
  };

  componentDidMount() {
    this.listLinkAuthUsers();
  }

  listLinkAuthUsers = () => {
    const { linkToken, path } = this.props;
    shareLinkAPI.listShareLinkAuthUsers(linkToken, path).then(res => {
      this.setState({authUsers: res.data.auth_list});
    });
  };

  addLinkAuthUsers = () => {
    const { linkToken, path } = this.props;
    const { selectedOption } = this.state;
    if (!selectedOption || !selectedOption.length ) {
      return false;
    }
    const users = selectedOption.map((item, index) => item.email);
    shareLinkAPI.addShareLinkAuthUsers(linkToken, users, path).then(res => {
      let authUsers = this.state.authUsers;
      let newAuthUsers = [...authUsers, ...res.data.auth_list];
      this.setState({
        authUsers: newAuthUsers,
        selectedOption: null
      });
      this.refs.userSelect.clearSelect();
    });
  };

  deleteItem = (username) => {
    const { linkToken, path } = this.props;
    let users = [username, ];
    shareLinkAPI.deleteShareLinkAuthUsers(linkToken, users, path).then(res => {
      let authUsers = this.state.authUsers.filter(user => {
        return user.username !== username;
      });
      this.setState({
        authUsers: authUsers
      });
    });
  };

  goBack = () => {
    this.props.setMode('displayLinkDetails');
  };

  render() {
    let { authUsers } = this.state;
    const thead = (
      <thead>
        <tr>
          <th width="82%">
            <button
              className="fa fa-arrow-left back-icon border-0 bg-transparent text-secondary p-0 mr-2"
              onClick={this.goBack}
              title={gettext('Back')}
              aria-label={gettext('Back')}>
            </button>
            {gettext('Links')}
          </th>
          <th width="18%"></th>
        </tr>
      </thead>
    );
    return (
      <Fragment>
        <table className="w-xs-200">
          {this.props.hideHead ? null : thead}
          <tbody>
            <tr>
              <td width="82%">
                <UserSelect
                  ref="userSelect"
                  isMulti={true}
                  className="reviewer-select"
                  placeholder={gettext('Search users')}
                  onSelectChange={this.handleSelectChange}
                />
              </td>
              <td width="18%">
                <Button onClick={this.addLinkAuthUsers}>{gettext('Submit')}</Button>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="auth-share-list-container">
          <table className="table-thead-hidden w-xs-200">
            {thead}
            <UserList
              repoID={this.props.repoID}
              items={authUsers}
              linkToken={this.props.linkToken}
              deleteItem={this.deleteItem}
            />
          </table>
        </div>
      </Fragment>
    );
  }
}

LinkUserAuth.propTypes = propTypes;

export default LinkUserAuth;