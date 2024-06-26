import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button } from 'reactstrap';
import { Utils } from '../../utils/utils';
import '../../css/invitations.css';

import '../../css/share-to-user.css';
import { shareLinkAPI } from '../../utils/share-link-api';

class EmailItem extends React.Component {

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
    this.props.deleteItem(item);

  };

  render() {
    let item = this.props.item;
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} tabIndex="0" onFocus={this.onMouseEnter}>
        <td className="name">
          <div className="position-relative" title={item}>
            <span>{item}</span>
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

EmailItem.propTypes = {
  repoID: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired,
  deleteItem: PropTypes.func.isRequired,
};

class EmailList extends React.Component {

  render() {
    let items = this.props.items;
    return (
      <tbody>
        {items.map((item, index) => {
          return (
            <EmailItem
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

EmailList.propTypes = {
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

class LinkEmailAuth extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      inputEmails: null,
      authEmails: []
    };
  }


  componentDidMount() {
    this.listLinkAuthUsers();
  }

  listLinkAuthUsers = () => {
    const { linkToken, path } = this.props;
    shareLinkAPI.listShareLinkAuthEmails(linkToken, path).then(res => {
      this.setState({authEmails: res.data.auth_list});
    });
  };

  addLinkAuthUsers = () => {
    const { linkToken, path } = this.props;
    const { inputEmails } = this.state;
    shareLinkAPI.addShareLinkAuthEmails(linkToken, inputEmails, path).then(res => {
      let authEmails = this.state.authEmails;
      let newAuthUsers = [...authEmails, ...res.data.auth_list];
      this.setState({
        authEmails: newAuthUsers,
        inputEmails: null
      });
      this.refs.userSelect.clearSelect();
    });
  };

  deleteItem = (email) => {
    const { linkToken, path } = this.props;
    let emails = [email, ];
    shareLinkAPI.deleteShareLinkAuthEmails(linkToken, emails, path).then(res => {
      let authEmails = this.state.authEmails.filter(e => {
        return e !== email;
      });
      this.setState({
        authEmails: authEmails
      });
    });
  };

  goBack = () => {
    this.props.setMode('displayLinkDetails');
  };

  handleInputChange = (e) => {
    this.setState({
      inputEmails: e.target.value
    });
  };

  render() {
    let { authEmails, inputEmails } = this.state;
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
                <input type="text" className="form-control" value={inputEmails} onChange={this.handleInputChange} placeholder={gettext('Emails, separated by \',\'')}/>
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
            <EmailList
              repoID={this.props.repoID}
              items={authEmails}
              linkToken={this.props.linkToken}
              deleteItem={this.deleteItem}
            />
          </table>
        </div>
      </Fragment>
    );
  }
}

LinkEmailAuth.propTypes = propTypes;

export default LinkEmailAuth;