import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import {gettext} from '../../utils/constants';
import {Modal, ModalHeader, ModalBody, Button, Input} from 'reactstrap';
import RepoAPITokenPermissionEditor from '../select-editor/repo-api-token-permission-editor';
import {seafileAPI} from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import copy from 'copy-to-clipboard';
import Loading from '../loading';
import OpIcon from '../op-icon';

const apiTokenItemPropTypes = {
  item: PropTypes.object.isRequired,
  deleteAPIToken: PropTypes.func.isRequired,
  updateAPIToken: PropTypes.func.isRequired,
};

class APITokenItem extends React.Component {

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

    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} tabIndex="0" onFocus={this.onMouseEnter}>
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
          <span>{item.api_token}</span>
          {this.state.isOperationShow &&
            <OpIcon
              className="far fa-copy action-icon"
              op={this.onCopyAPIToken}
              title={gettext('Copy')}
            />
          }
        </td>
        <td>
          <OpIcon
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'hide'}`}
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
    this.repo = this.props.repo;
  }

  listAPITokens = () => {
    seafileAPI.listRepoAPITokens(this.repo.repo_id).then((res) => {
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
    this.setState({permission: permission});
  };

  addAPIToken = () => {
    if (!this.state.appName) {
      return;
    }

    this.setState({
      isSubmitBtnActive: false,
    });
    const {appName, permission, apiTokenList} = this.state;

    seafileAPI.addRepoAPIToken(this.repo.repo_id, appName, permission).then((res) => {
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
    seafileAPI.deleteRepoAPIToken(this.repo.repo_id, appName).then((res) => {
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
    seafileAPI.updateRepoAPIToken(this.repo.repo_id, appName, permission).then((res) => {
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
      toaster.danger(e.response.data.error_msg || e.response.data.detail || gettext('Error'), {duration: 3});
    } else {
      toaster.danger(gettext('Please check the network.'), {duration: 3});
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
                  <Button onClick={this.addAPIToken} disabled={!this.state.isSubmitBtnActive}>{gettext('Submit')}</Button>
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{minHeight: '10rem', maxHeight: '18rem'}}>
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
    let repo = this.repo;

    const itemName = '<span class="op-target">' + Utils.HTMLescape(repo.repo_name) + '</span>';
    const title = gettext('{placeholder} API Token').replace('{placeholder}', itemName);
    return (
      <Modal
        isOpen={true} style={{maxWidth: '800px'}}
        toggle={this.props.onRepoAPITokenToggle}
      >
        <ModalHeader toggle={this.props.onRepoAPITokenToggle}>
          <p dangerouslySetInnerHTML={{__html: title}} className="m-0"></p>
        </ModalHeader>
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
