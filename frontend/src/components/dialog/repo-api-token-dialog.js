import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Modal, ModalBody, Button, Input } from 'reactstrap';
import { gettext, LARGE_DIALOG_STYLE } from '../../utils/constants';
import RepoAPITokenPermissionEditor from '../select-editor/repo-api-token-permission-editor';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import copy from 'copy-to-clipboard';
import Loading from '../loading';
import OpIcon from '../op-icon';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const apiTokenItemPropTypes = {
  item: PropTypes.object.isRequired,
  deleteAPIToken: PropTypes.func.isRequired,
  updateAPIToken: PropTypes.func.isRequired,
};

class APITokenItem extends React.Component {

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

  onDeleteAPIToken = () => {
    this.props.deleteAPIToken(this.props.item.app_name);
  };

  onUpdateAPIToken = (permission) => {
    this.props.updateAPIToken(this.props.item.app_name, permission);
  };

  onCopyAPIToken = () => {
    let api_token = this.props.item.api_token;
    copy(api_token);
    toaster.success(gettext('API token is copied to the clipboard.'));
  };

  render() {
    let item = this.props.item;
    const { isHighlighted } = this.state;

    return (
      <tr
        className={classnames({
          'tr-highlight': isHighlighted
        })}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        tabIndex="0"
        onFocus={this.onMouseEnter}
      >
        <td className="name">{item.app_name}</td>
        <td>
          <RepoAPITokenPermissionEditor
            isTextMode={true}
            isEditIconShow={this.state.isOperationShow}
            currentPermission={item.permission}
            onPermissionChanged={this.onUpdateAPIToken}
          />
        </td>
        <td>
          <div className="d-flex align-items-center">
            <span>{item.api_token}</span>
            {this.state.isOperationShow &&
            <OpIcon
              symbol="copy"
              className="op-icon ml-1"
              op={this.onCopyAPIToken}
              title={gettext('Copy')}
            />
            }
          </div>
        </td>
        <td>
          <OpIcon
            className={`op-icon ${this.state.isOperationShow ? '' : 'd-none'}`}
            symbol="close"
            op={this.onDeleteAPIToken}
            title={gettext('Delete')}
          />
        </td>
      </tr>
    );
  }
}

APITokenItem.propTypes = apiTokenItemPropTypes;

const propTypes = {
  repo: PropTypes.object.isRequired,
  onRepoAPITokenToggle: PropTypes.func.isRequired,
};

class RepoAPITokenDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      apiTokenList: [],
      permission: 'rw',
      appName: '',
      errorMsg: '',
      loading: true,
      isSubmitBtnActive: true,
    };
  }

  listAPITokens = () => {
    seafileAPI.listRepoAPITokens(this.props.repo.repo_id).then((res) => {
      this.setState({
        apiTokenList: res.data.repo_api_tokens,
        loading: false,
      });
    }).catch(error => {
      if (error.response.status === 403) {
        this.setState({
          errorMsg: gettext('Permission denied'),
        });
      } else {
        this.handleError(error);
      }
    });
  };

  onInputChange = (e) => {
    let appName = e.target.value;
    this.setState({
      appName: appName,
    });
  };

  onKeyDown = (e) => {
    if (e.keyCode === 13) {
      e.preventDefault();
      this.addAPIToken();
    }
  };

  setPermission = (permission) => {
    this.setState({ permission: permission });
  };

  addAPIToken = () => {
    if (!this.state.appName) {
      return;
    }

    this.setState({
      isSubmitBtnActive: false,
    });
    const { appName, permission, apiTokenList } = this.state;

    seafileAPI.addRepoAPIToken(this.props.repo.repo_id, appName, permission).then((res) => {
      apiTokenList.push(res.data);
      this.setState({
        apiTokenList: apiTokenList,
        isSubmitBtnActive: true,
      });
    }).catch(error => {
      this.handleError(error);
      this.setState({
        isSubmitBtnActive: true,
      });
    });
  };

  deleteAPIToken = (appName) => {
    seafileAPI.deleteRepoAPIToken(this.props.repo.repo_id, appName).then((res) => {
      const apiTokenList = this.state.apiTokenList.filter(item => {
        return item.app_name !== appName;
      });
      this.setState({
        apiTokenList: apiTokenList,
      });
    }).catch(error => {
      this.handleError(error);
    });
  };

  updateAPIToken = (appName, permission) => {
    seafileAPI.updateRepoAPIToken(this.props.repo.repo_id, appName, permission).then((res) => {
      let apiTokenList = this.state.apiTokenList.filter(item => {
        if (item.app_name === appName) {
          item.permission = permission;
        }
        return item;
      });
      this.setState({
        apiTokenList: apiTokenList,
      });
    }).catch(error => {
      this.handleError(error);
    });
  };

  handleError = (e) => {
    if (e.response) {
      toaster.danger(e.response.data.error_msg || e.response.data.detail || gettext('Error'), { duration: 3 });
    } else {
      toaster.danger(gettext('Please check the network.'), { duration: 3 });
    }
  };

  componentDidMount() {
    this.listAPITokens();
  }

  renderContent = () => {
    const renderAPITokenList = this.state.apiTokenList.map((item, index) => {
      return (
        <APITokenItem
          key={index}
          item={item}
          deleteAPIToken={this.deleteAPIToken}
          updateAPIToken={this.updateAPIToken}
        />
      );
    });

    const thead = (
      <thead>
        <tr>
          <th width="20%">{gettext('App Name')}</th>
          <th width="20%">{gettext('Permission')}</th>
          <th width="48%">API Token</th>
          <th width="12%"></th>
        </tr>
      </thead>
    );
    return (
      <Fragment>
        {this.state.errorMsg &&
          <p className="error text-center">{this.state.errorMsg}</p>
        }
        {!this.state.errorMsg &&
        <Fragment>
          <table className="w-xs-250">
            {thead}
            <tbody>
              <tr>
                <td>
                  <Input
                    type="text"
                    id="appName"
                    value={this.state.appName}
                    onChange={this.onInputChange}
                    onKeyDown={this.onKeyDown}
                  />
                </td>
                <td>
                  <RepoAPITokenPermissionEditor
                    isTextMode={false}
                    isEditIconShow={false}
                    currentPermission={this.state.permission}
                    onPermissionChanged={this.setPermission}
                  />
                </td>
                <td><span className="text-secondary">--</span></td>
                <td>
                  <Button color="primary" onClick={this.addAPIToken} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ minHeight: '10rem', maxHeight: '18rem' }}>
            {this.state.apiTokenList.length !== 0 &&
            <table className="table-thead-hidden w-xs-250">
              {thead}
              <tbody>
                {renderAPITokenList}
              </tbody>
            </table>
            }
          </div>
          {this.state.loading && <Loading/>}
        </Fragment>
        }
      </Fragment>
    );
  };

  render() {
    const itemName = '<span class="op-target text-truncate mr-1">' + Utils.HTMLescape(this.props.repo.repo_name) + '</span>';
    const title = gettext('{placeholder} API Token').replace('{placeholder}', itemName);
    return (
      <Modal isOpen={true} style={LARGE_DIALOG_STYLE} toggle={this.props.onRepoAPITokenToggle}>
        <SeahubModalHeader toggle={this.props.onRepoAPITokenToggle}>
          <span dangerouslySetInnerHTML={{ __html: title }} className="d-flex mw-100"></span>
        </SeahubModalHeader>
        <ModalBody>
          <div className="o-auto">
            {this.renderContent()}
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

RepoAPITokenDialog.propTypes = propTypes;

export default RepoAPITokenDialog;
