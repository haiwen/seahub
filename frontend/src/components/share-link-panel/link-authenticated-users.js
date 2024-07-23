import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button } from 'reactstrap';
import { shareLinkAPI } from '../../utils/share-link-api';
import { Utils } from '../../utils/utils';
import UserSelect from '../user-select';
import toaster from '../toast';

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
      selectedOption: null,
      authUsers: []
    };
  }

  componentDidMount() {
    this.listLinkAuthUsers();
  }

  listLinkAuthUsers = () => {
    const { linkToken, path } = this.props;
    shareLinkAPI.listShareLinkAuthUsers(linkToken, path).then(res => {
      this.setState({ authUsers: res.data.auth_list });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  addLinkAuthUsers = () => {
    const { linkToken, path } = this.props;
    const { selectedOption, authUsers } = this.state;
    if (!selectedOption || !selectedOption.length) {
      return false;
    }
    const users = selectedOption.map((item, index) => item.email);
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
        selectedOption: null
      });
      this.refs.userSelect.clearSelect();
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
    this.setState({ selectedOption: option });
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
      <Fragment>
        <div className="d-flex align-items-center pb-2 border-bottom">
          <h6 className="font-weight-normal m-0">
            <button
              className="sf3-font sf3-font-arrow rotate-180 d-inline-block back-icon border-0 bg-transparent text-secondary p-0 mr-2"
              onClick={this.goBack}
              title={gettext('Back')}
              aria-label={gettext('Back')}
            >
            </button>
            {gettext('Authenticated users')}
          </h6>
        </div>
        <table className="table-thead-hidden w-xs-200">
          {thead}
          <tbody>
            <tr>
              <td>
                <UserSelect
                  ref="userSelect"
                  isMulti={true}
                  placeholder={gettext('Search users')}
                  onSelectChange={this.handleSelectChange}
                />
              </td>
              <td>
                <Button onClick={this.addLinkAuthUsers}>{gettext('Submit')}</Button>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="share-list-container">
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
        </div>
      </Fragment>
    );
  }
}

LinkAuthenticatedUsers.propTypes = propTypes;

export default LinkAuthenticatedUsers;
