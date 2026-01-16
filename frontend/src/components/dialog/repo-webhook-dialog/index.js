import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import Loading from '../../loading';
import OpIcon from '../../op-icon';
import EmptyTip from '../../empty-tip';
import WebhookItem from './webhook-item';
import DeleteWebHookDialog from './delete-webhook-dialog';
import EditWebHookDialog from './edit-webhook-dialog';
import toaster from '../../toast';

import './index.css';

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
      currentWebhook: null,
      showEditDialog: false,
      showDeleteDialog: false,
      submitBtnDisabled: false,
    };
  }

  componentDidMount() {
    this.listWebhooks();
  }

  handleError = (e) => {
    const errorMsg = Utils.getErrorMsg(e, true);
    toaster.danger(errorMsg);
  };

  listWebhooks = () => {
    const { repo } = this.props;
    seafileAPI.listRepoWebhooks(repo.repo_id).then((res) => {
      this.setState({
        loading: false,
        webhookList: res.data.webhook_list,
      });
    }).catch(error => {
      this.handleError(error);
      this.setState({ loading: false });
    });
  };

  onAddWebhookToggle = () => {
    this.setState({ currentWebhook: null, showEditDialog: true });
  };

  onEditWebhook = (item) => {
    this.setState({ currentWebhook: item, showEditDialog: true });
  };

  toggleEditDialog = () => {
    this.setState({ showEditDialog: !this.state.showEditDialog });
  };

  addRepoWebhook = (webhook) => {
    const { repo } = this.props;
    const { webhookList } = this.state;
    const { url, secret } = webhook;
    seafileAPI.addRepoWebhook(repo.repo_id, url, secret).then(res => {
      const webhook = res.data.webhook;
      const newWebHook = {
        id: webhook.id,
        url: url,
        secret,
      };
      const newWebHookList = [...webhookList, newWebHook];
      this.setState({ webhookList: newWebHookList, showEditDialog: false });
    }).catch(error => {
      this.handleError(error);
    });
  };

  updateRepoWebhook = (webhook) => {
    const { repo } = this.props;
    const { currentWebhook, webhookList } = this.state;
    const { url, secret } = webhook;
    seafileAPI.updateRepoWebhook(repo.repo_id, currentWebhook.id, url, secret).then(res => {
      const newWebHookList = webhookList.map(item => {
        if (item.id === currentWebhook.id) {
          item.url = url;
          item.secret = secret;
        }
        return item;
      });
      this.setState({ webhookList: newWebHookList, showEditDialog: false });
    }).catch(error => {
      this.handleError(error);
    });
  };

  onDeleteWebhook = (item) => {
    this.setState({ currentWebhook: item, showDeleteDialog: true });
  };

  toggleDeleteDialog = () => {
    this.setState({ showDeleteDialog: !this.state.showDeleteDialog });
  };

  deleteRepoWebhook = () => {
    const { repo } = this.props;
    const { currentWebhook, webhookList } = this.state;
    seafileAPI.deleteRepoWebhook(repo.repo_id, currentWebhook.id).then(res => {
      const newWebHookList = webhookList.filter(item => item.id !== currentWebhook.id);
      this.setState({ webhookList: newWebHookList, showDeleteDialog: false });
    }).catch(error => {
      this.handleError(error);
    });
  };

  render() {
    const { onRepoWebhookToggle } = this.props;
    const { webhookList, loading, showDeleteDialog, showEditDialog, currentWebhook } = this.state;
    return (
      <Fragment>
        <Modal isOpen={true} style={{ maxWidth: '720px' }} toggle={onRepoWebhookToggle} contentClassName="webhook-content-container">
          <SeahubModalHeader toggle={onRepoWebhookToggle}>
            {gettext('Webhooks')}{' '}
            <span className="op-target text-truncate mr-1">{Utils.HTMLescape(this.props.repo.repo_name)}</span>
          </SeahubModalHeader>
          <ModalBody className='webhook-content-body'>
            {loading && <Loading />}
            {!loading && webhookList.length === 0 && (
              <EmptyTip text={gettext('No webhook')} className="h-100 m-0" />
            )}
            {!loading && webhookList.length > 0 && (
              <div className="webhook-list-wrapper">
                <div className='webhook-list-header'>{gettext('URL')}</div>
                <div className='webhook-list-container'>
                  {webhookList.map((item, index) => {
                    return (
                      <WebhookItem
                        key={index}
                        item={item}
                        onEditWebhook={this.onEditWebhook}
                        onDeleteWebhook={this.onDeleteWebhook}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </ModalBody>
          <div className="webhook-add-toolbar" onClick={this.onAddWebhookToggle}>
            <OpIcon symbol="add-table" className="mr-1" />{' '}
            <span>{gettext('Add webhook')}</span>
          </div>
        </Modal>
        {showEditDialog && (
          <EditWebHookDialog
            webhook={currentWebhook}
            updateWebhook={this.updateRepoWebhook}
            addWebhook={this.addRepoWebhook}
            toggle={this.toggleEditDialog}
          />
        )}
        {showDeleteDialog && (
          <DeleteWebHookDialog
            deleteWebhook={this.deleteRepoWebhook}
            toggleDeleteDialog={this.toggleDeleteDialog}
          />
        )}
      </Fragment>
    );
  }
}

RepoWebhookDialog.propTypes = propTypes;

export default RepoWebhookDialog;
