import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button } from 'reactstrap';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import { shareLinkAPI } from '../../utils/share-link-api';
import BackIcon from '../back-icon';
import EmptyTip from '../empty-tip';
import Loading from '../loading';

class EmailItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isOperationShow: false,
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
    this.props.deleteItem(item);
  };

  render() {
    const { item } = this.props;
    return (
      <tr
        className={this.state.isHighlighted ? 'tr-highlight' : ''}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onFocus={this.onMouseEnter}
        tabIndex="0"
      >
        <td>{item}</td>
        <td>
          <span
            tabIndex="0"
            role="button"
            className={`sf2-icon-x3 op-icon ${this.state.isOperationShow ? '' : 'hide'}`}
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
  item: PropTypes.string.isRequired,
  deleteItem: PropTypes.func.isRequired,
};

const propTypes = {
  repoID: PropTypes.string.isRequired,
  linkToken: PropTypes.string,
  setMode: PropTypes.func,
  path: PropTypes.string,
};

class LinkAuthenticatedEmails extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      inputEmails: '',
      authEmails: [],
      isSubmitting: false,
      isLoading: true
    };
  }

  componentDidMount() {
    this.getItems();
  }

  getItems = () => {
    const { linkToken, path } = this.props;
    shareLinkAPI.listShareLinkAuthEmails(linkToken, path).then(res => {
      this.setState({
        authEmails: res.data.auth_list,
        isLoading: false
      });
    }).catch(error => {
      this.setState({ isLoading: false });
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onSubmit = () => {
    const { linkToken, path } = this.props;
    const { inputEmails, authEmails } = this.state;
    this.setState({
      isSubmitting: true
    });
    toaster.notify(gettext('It may take some time, please wait.'));
    shareLinkAPI.addShareLinkAuthEmails(linkToken, inputEmails, path).then(res => {
      const { success, failed } = res.data;
      let newEmails = [];
      if (success.length) {
        newEmails = success.map(item => item.email);
        let msg = gettext('Successfully added %s.').replace('%s', newEmails.join(', '));
        toaster.success(msg);
      }
      if (failed.length) {
        failed.forEach(item => {
          let msg = `${item.email}: ${item.error_msg}`;
          toaster.danger(msg);
        });
      }
      this.setState({
        authEmails: newEmails.concat(authEmails),
        inputEmails: '',
        isSubmitting: false
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.setState({
        isSubmitting: false
      });
    });
  };

  deleteItem = (email) => {
    const { linkToken, path } = this.props;
    let emails = [email,];
    shareLinkAPI.deleteShareLinkAuthEmails(linkToken, emails, path).then(res => {
      let authEmails = this.state.authEmails.filter(e => {
        return e !== email;
      });
      this.setState({
        authEmails: authEmails
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
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
    const { authEmails, inputEmails, isSubmitting } = this.state;
    const btnDisabled = !inputEmails.trim() || isSubmitting;
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
            <BackIcon onClick={this.goBack} />
            {gettext('Authenticated emails')}
          </h6>
        </div>
        <table className="table-thead-hidden w-xs-200">
          {thead}
          <tbody>
            <tr>
              <td>
                <input type="text" className="form-control" value={inputEmails} onChange={this.handleInputChange} placeholder={gettext('Emails, separated by \',\'')} />
              </td>
              <td>
                <Button disabled={btnDisabled} onClick={this.onSubmit}>
                  {gettext('Submit')}
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
        <div className="share-list-container">
          {this.state.isLoading ? (
            <Loading />
          ) : (
            <>
              {authEmails.length === 0 ? (
                <EmptyTip text={gettext('No results')} />
              ) : (
                <table className="table-thead-hidden w-xs-200">
                  {thead}
                  <tbody>
                    {authEmails.map((item, index) => {
                      return (
                        <EmailItem
                          key={index}
                          item={item}
                          repoID={this.props.repoID}
                          deleteItem={this.deleteItem}
                        />
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </Fragment>
    );
  }
}

LinkAuthenticatedEmails.propTypes = propTypes;

export default LinkAuthenticatedEmails;
