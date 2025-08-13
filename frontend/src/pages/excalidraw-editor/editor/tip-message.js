import React from 'react';
import dayjs from 'dayjs';
import EventBus from '../utils/event-bus';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';

class TipMessage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isSaved: false,
      isSaving: false,
      lastSavedAt: '',
    };
    this.saveTimer = null;
  }

  componentDidMount() {
    const eventBus = EventBus.getInstance();
    this.unsubscribeSavingEvent = eventBus.subscribe('is-saving', this.onDocumentSaving);
    this.unsubscribeSavedEvent = eventBus.subscribe('saved', this.onDocumentSaved);

    // offline reconnect
    this.unsubscribeDisconnectEvent = eventBus.subscribe('disconnect', this.onDisconnect);
    this.unsubscribeReconnectErrorEvent = eventBus.subscribe('reconnect_error', this.onReconnectError);
    this.unsubscribeReconnectEvent = eventBus.subscribe('reconnect', this.onReconnect);

    // server return error
    this.unsubscribeOpExecError = eventBus.subscribe('execute_client_operations_error', this.onOperationExecuteError);
    this.unsubscribeSyncServerOpError = eventBus.subscribe('sync_server_operations_error', this.onSyncServerOperationError);
    this.unsubscribeDocumentLoadError = eventBus.subscribe('load_document_content_error', this.onInternalServerExecError);
    this.unsubscribeOperationsSaveError = eventBus.subscribe('token_expired', this.onTokenExpiredError);

    // local error
    this.unsubscribePendingOpExceedLimit = eventBus.subscribe('pending_operations_exceed_limit', this.onPendingOpExceedLimit);
  }

  componentWillUnmount() {
    this.unsubscribeSavingEvent();
    this.unsubscribeSavedEvent();

    this.unsubscribeDisconnectEvent();
    this.unsubscribeReconnectErrorEvent();
    this.unsubscribeReconnectEvent();

    this.unsubscribeOpExecError();
    this.unsubscribeSyncServerOpError();
    this.unsubscribePendingOpExceedLimit();
    this.unsubscribeDocumentLoadError();
    this.unsubscribeOperationsSaveError();

    clearTimeout(this.saveTimer);
  }

  onOperationExecuteError = () => {
    const copyright = 'Failed to execute operation on server, the current operation has been withdrawn';
    const message = gettext(copyright);
    toaster.warning(message, { hasCloseButton: true });
  };

  onSyncServerOperationError = () => {
    const copyright = 'Synchronization with the server failed, please refresh the page';
    const message = gettext(copyright);
    toaster.danger(message, { hasCloseButton: false, duration: null });
  };

  onInternalServerExecError = () => {
    const copyright = 'An exception occurred on the server, please refresh the page and try again';
    const message = gettext(copyright);
    toaster.danger(message, { hasCloseButton: false, duration: null });
  };

  onTokenExpiredError = (msg) => {
    const copyright = 'Token expired. Please refresh the page.';
    const message = gettext(copyright);
    toaster.closeAll();
    toaster.danger(message, { duration: null });
  };

  onPendingOpExceedLimit = () => {
    toaster.closeAll();
    const copyright = 'There are multiple operations not synced to the server. Please check your network.';
    const message = gettext(copyright);
    toaster.warning(message, { duration: 5 });
  };

  onDisconnect = () => {
    const copyright = 'Server is not connected. Operation will be sent to server later.';
    const message = gettext(copyright);
    toaster.warning(message, { hasCloseButton: true, duration: null });
  };

  onReconnectError = () => {
    if (!this.isConnectError) {
      this.isConnectError = true;
      const copyright = 'Server is disconnected. Reconnecting...';
      const message = gettext(copyright);
      toaster.closeAll();
      toaster.warning(message, { hasCloseButton: true, duration: null });
    }
  };

  onReconnect = () => {
    this.isConnectError = false;
    const copyright = 'Server is reconnected.';
    const message = gettext(copyright);
    toaster.closeAll();
    toaster.success(message); // close after serval seconds
  };

  onDocumentSaving = () => {
    this.setState({
      isSaving: true,
      isSaved: false
    });
  };

  onDocumentSaved = (lastSavedAt) => {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.resetTimer) clearTimeout(this.resetTimer);
    this.saveTimer = setTimeout(() => {
      this.setState({
        lastSavedAt,
        isSaving: false,
        isSaved: true
      });
    }, 1000);
    this.resetTimer = setTimeout(() => {
      this.setState({
        isSaving: false,
        isSaved: false
      });
    }, 2000);
  };

  render = () => {
    const { isSaved, isSaving, lastSavedAt } = this.state;

    if (isSaving && !isSaved) {
      return <span className="tip-message">{gettext('Saving...')}</span>;
    }

    if (!isSaving && isSaved) {
      return <span className="tip-message">{gettext('All changes saved')}</span>;
    }
    if (lastSavedAt) {
      return (
        <span className='tip-message'>
          <span className='sdocfont sdoc-save-tip mr-2'></span>
          <span className='save-time'>{dayjs(lastSavedAt).format('HH:mm')}</span>
        </span>
      );
    }

    return null;
  };
}

export default TipMessage;
