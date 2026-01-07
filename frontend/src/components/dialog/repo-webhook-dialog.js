import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input, Alert } from 'reactstrap';
import { gettext, LARGE_DIALOG_STYLE } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import Loading from '../loading';
import OpIcon from '../op-icon';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const webhookItemPropTypes = {
  item: PropTypes.object.isRequired,
  onDeleteWebhook: PropTypes.func.isRequired,
  onEditWebhook: PropTypes.func.isRequired,
};

class WebhookItem extends React.Component {

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

  onDeleteWebhook = () => {
    this.props.onDeleteWebhook(this.props.item);
  };

  onEditWebhook = () => {
    this.props.onEditWebhook(this.props.item);
  };

  render() {
    let item = this.props.item;
    const { isHighlighted } = this.state;

    return (
      <tr
        className={isHighlighted ? 'tr-highlight' : ''}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
      >
        <td>
          <div className="d-flex justify-content-between align-items-center">
            <div className="text-truncate" title={item.url}>{item.url}</div>
            <div className={`d-flex ${this.state.isOperationShow ? '' : 'invisible'}`}>
              <OpIcon
                symbol="edit"
                className="op-icon mr-1"
                op={this.onEditWebhook}
                title={gettext('Edit')}
              />
              <OpIcon
                symbol="delete"
                className="op-icon"
                op={this.onDeleteWebhook}
                title={gettext('Delete')}
              />
            </div>
          </div>
        </td>
      </tr>
    );
  }
}

WebhookItem.propTypes = webhookItemPropTypes;

const propTypes = {
  repo: PropTypes.object.isRequired,
  onRepoWebhookToggle: PropTypes.func.isRequired,
};

class RepoWebhookDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      webhookList: [],
      mode: 'list', // list, add, edit
      // Sub-dialog states
      showAddDialog: false,
      showEditDialog: false,
      showDeleteDialog: false,
      targetWebhook: null,
      url: '',
      secret: '',
      submitBtnDisabled: false,
    };
  }

  componentDidMount() {
    this.listWebhooks();
  }

  listWebhooks = () => {
    seafileAPI.listRepoWebhooks(this.props.repo.repo_id).then((res) => {
      this.setState({
        webhookList: res.data.webhook_list,
        loading: false,
        errorMsg: '',
      });
    }).catch(error => {
      this.handleError(error);
      this.setState({ loading: false });
    });
  };

  handleError = (e) => {
    let errorMsg = Utils.getErrorMsg(e, true);
    this.setState({ errorMsg: errorMsg });
  };

  // Add Dialog Handlers
  onAddWebhook = () => {
    this.setState({
      showAddDialog: true,
      url: '',
      secret: '',
      errorMsg: '',
    });
  };

  toggleAddDialog = () => {
    this.setState({ showAddDialog: !this.state.showAddDialog });
  };

  onSubmitAdd = () => {
    const { url, secret } = this.state;
    if (!url.trim()) return;
    this.setState({ submitBtnDisabled: true });
    seafileAPI.addRepoWebhook(this.props.repo.repo_id, url, secret).then(res => {
      this.listWebhooks();
      this.setState({
        submitBtnDisabled: false,
        showAddDialog: false,
      });
    }).catch(error => {
      let errorMsg = Utils.getErrorMsg(error, true);
      this.setState({
        submitBtnDisabled: false,
        errorMsg: errorMsg,
      });
    });
  };

  // Edit Dialog Handlers
  onEditWebhook = (item) => {
    this.setState({
      showEditDialog: true,
      targetWebhook: item,
      url: item.url,
      secret: item.secret || '',
      errorMsg: '',
    });
  };

  toggleEditDialog = () => {
    this.setState({ showEditDialog: !this.state.showEditDialog });
  };

  onSubmitEdit = () => {
    const { url, secret, targetWebhook } = this.state;
    if (!url.trim()) return;
    this.setState({ submitBtnDisabled: true });
    seafileAPI.updateRepoWebhook(this.props.repo.repo_id, targetWebhook.id, url, secret).then(res => {
      this.listWebhooks();
      this.setState({
        submitBtnDisabled: false,
        showEditDialog: false
      });
    }).catch(error => {
      let errorMsg = Utils.getErrorMsg(error, true);
      this.setState({
        submitBtnDisabled: false,
        errorMsg: errorMsg
      });
    });
  };

  // Delete Dialog Handlers
  onDeleteWebhook = (item) => {
    this.setState({
      showDeleteDialog: true,
      targetWebhook: item,
      errorMsg: '',
    });
  };

  toggleDeleteDialog = () => {
    this.setState({ showDeleteDialog: !this.state.showDeleteDialog });
  };

  onSubmitDelete = () => {
    const { targetWebhook } = this.state;
    this.setState({ submitBtnDisabled: true });
    seafileAPI.deleteRepoWebhook(this.props.repo.repo_id, targetWebhook.id).then(res => {
      this.listWebhooks();
      this.setState({
        submitBtnDisabled: false,
        showDeleteDialog: false
      });
    }).catch(error => {
      let errorMsg = Utils.getErrorMsg(error, true);
      this.setState({
        submitBtnDisabled: false,
        errorMsg: errorMsg
      });
    });
  };

  renderList = () => {
    const { webhookList, loading } = this.state;
    if (loading) return <Loading />;

    // Style for fixed height list area to match screenshot
    const listStyle = {
      minHeight: '350px',
      position: 'relative',
    };

    return (
      <div style={listStyle} className="d-flex flex-column justify-content-between">
        <table className="table-hover">
          <thead>
            <tr>
              <th width="100%">{gettext('URL')}</th>
            </tr>
          </thead>
          <tbody>
            {webhookList.map((item, index) => {
              return (
                <WebhookItem
                  key={index}
                  item={item}
                  onDeleteWebhook={this.onDeleteWebhook}
                  onEditWebhook={this.onEditWebhook}
                />
              );
            })}
          </tbody>
        </table>
        <div className="mt-2">
          <button className="btn btn-link text-decoration-none p-0" onClick={this.onAddWebhook}>
            <OpIcon symbol="plus" className="mr-1" />
            {gettext('Add webhook')}
          </button>
        </div>
      </div>
    );
  };

  renderAddOrEditDialog = () => {
    const { showAddDialog, showEditDialog, url, secret, submitBtnDisabled, errorMsg } = this.state;
    const isEdit = showEditDialog; // true for edit, false for add
    const isOpen = showAddDialog || showEditDialog;
    const toggle = isEdit ? this.toggleEditDialog : this.toggleAddDialog;
    const submit = isEdit ? this.onSubmitEdit : this.onSubmitAdd;
    const title = isEdit ? gettext('Update webhook') : gettext('Add webhook');

    return (
      <Modal isOpen={isOpen} toggle={toggle}>
        <SeahubModalHeader toggle={toggle}>
          {title}
        </SeahubModalHeader>
        <ModalBody>
          {errorMsg && <Alert color="danger">{errorMsg}</Alert>}
          <Form>
            <FormGroup>
              <Label for="webhookUrl">{gettext('URL')}</Label>
              <Input
                id="webhookUrl"
                value={url}
                onChange={(e) => this.setState({ url: e.target.value })}
                placeholder="http://test.com"
              />
              <div className="form-text text-muted">{gettext('URL should start with http(s).')}</div>
            </FormGroup>
            <FormGroup>
              <Label for="webhookSecret">{gettext('Secret')}</Label>
              <Input
                id="webhookSecret"
                value={secret}
                onChange={(e) => this.setState({ secret: e.target.value })}
              />
              <div className="form-text text-muted">
                {gettext('When you set a secret, you will receive the X-Seafile-Signature header in the webhook POST request, which is the SHA256 encryption result of the secret and request.body.')}
              </div>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={submit} disabled={submitBtnDisabled}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  };

  renderDeleteDialog = () => {
    const { showDeleteDialog, submitBtnDisabled, errorMsg } = this.state;
    return (
      <Modal isOpen={showDeleteDialog} toggle={this.toggleDeleteDialog}>
        <SeahubModalHeader toggle={this.toggleDeleteDialog}>
          {gettext('Delete webhook')}
        </SeahubModalHeader>
        <ModalBody>
          {errorMsg && <Alert color="danger">{errorMsg}</Alert>}
          <p>{gettext('Are you sure you want to delete this webhook?')}</p>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggleDeleteDialog}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.onSubmitDelete} disabled={submitBtnDisabled}>{gettext('Delete')}</Button>
        </ModalFooter>
      </Modal>
    );
  };

  render() {
    return (
      <Fragment>
        <Modal isOpen={true} style={LARGE_DIALOG_STYLE} toggle={this.props.onRepoWebhookToggle}>
          <SeahubModalHeader toggle={this.props.onRepoWebhookToggle}>
            <Fragment>
              <span className="op-target text-truncate mr-1">{Utils.HTMLescape(this.props.repo.repo_name)}</span>
              {gettext('Webhooks')}
            </Fragment>
          </SeahubModalHeader>
          <ModalBody>
            {/* List Dialog Body */}
            {this.renderList()}
          </ModalBody>
        </Modal>

        {/* Sub Dialogs */}
        {(this.state.showAddDialog || this.state.showEditDialog) && this.renderAddOrEditDialog()}
        {this.state.showDeleteDialog && this.renderDeleteDialog()}
      </Fragment>
    );
  }
}

RepoWebhookDialog.propTypes = propTypes;

export default RepoWebhookDialog;
