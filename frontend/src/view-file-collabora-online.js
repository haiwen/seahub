import React from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Input, Modal, ModalBody, ModalFooter } from 'reactstrap';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';
import { gettext, siteRoot } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import SeahubModalHeader from './components/common/seahub-modal-header';
import toaster from './components/toast';

const {
  err,
  fileName,
  repoID,
  actionURL,
  accessToken,
  accessTokenTtl,
} = window.app.pageOptions;

const actionOrigin = actionURL ? new URL(actionURL).origin : '';

function getSaveAsRedirectURL({ messageValues, currentFileName, parentDir, repoID, siteRoot }) {
  const { fileName, FileName, Name, Url } = messageValues || {};

  if (Url) {
    return Url;
  }

  const nextFileName = fileName || FileName || Name;
  if (!nextFileName || nextFileName === currentFileName) {
    return null;
  }

  const nextFilePath = Utils.joinPath(parentDir, nextFileName);
  return `${siteRoot}lib/${repoID}/file${Utils.encodePath(nextFilePath)}`;
}

class ViewFileCollaboraOnline extends React.Component {
  render() {
    return (
      <FileView content={<FileContent />} isOnlyofficeFile={true} documentVendor={'collaboraOnline'} />
    );
  }
}

class FileContent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isSaveAsDialogOpen: false,
      nextFileName: fileName,
    };
    this.mentionSequence = 0;
    this.mentionedUsers = new Set();
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.onMessage);
  }

  componentDidMount() {
    if (!err) {
      window.addEventListener('message', this.onMessage);
      document.getElementById('office-form').submit();
      document.getElementById('office-frame').className = 'd-block w-100 h-100 border-0';
    }
  }

  postReadyMessage = () => {
    const officeFrame = document.getElementById('office-frame');
    if (!officeFrame || !officeFrame.contentWindow || !actionOrigin) return;

    officeFrame.contentWindow.postMessage(JSON.stringify({
      MessageId: 'Host_PostmessageReady',
    }), actionOrigin);
  };

  navigateToSavedAsFile = (redirectUrl) => {
    if (!redirectUrl) return;
    window.location.replace(redirectUrl);
  };

  postMessageToOfficeFrame = (message) => {
    const officeFrame = document.getElementById('office-frame');
    if (!officeFrame || !officeFrame.contentWindow || !actionOrigin) return;

    officeFrame.contentWindow.postMessage(JSON.stringify(message), actionOrigin);
  };

  toggleSaveAsDialog = () => {
    this.setState((prevState) => ({
      isSaveAsDialogOpen: !prevState.isSaveAsDialogOpen,
      nextFileName: prevState.isSaveAsDialogOpen ? fileName : prevState.nextFileName,
    }));
  };

  onSaveAsFileNameChange = (event) => {
    this.setState({ nextFileName: event.target.value });
  };

  submitSaveAs = () => {
    const trimmedFileName = this.state.nextFileName.trim();
    if (!trimmedFileName) {
      toaster.danger(gettext('Name cannot be empty.'));
      return;
    }

    this.postMessageToOfficeFrame({
      MessageId: 'Action_SaveAs',
      Values: {
        Filename: trimmedFileName,
        Notify: true,
      },
    });
    this.setState({ isSaveAsDialogOpen: false });
  };

  onSaveAsKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submitSaveAs();
    }
  };

  cacheMentionNotifications = (mentionedUsers) => {
    const nextMentionedUsers = Array.from(new Set(mentionedUsers)).sort();
    if (!nextMentionedUsers.length) {
      return Promise.resolve();
    }

    this.mentionSequence += 1;

    return seafileAPI.sendWopiMentionNotifications(
      repoID,
      window.app.pageOptions.filePath,
      accessToken,
      nextMentionedUsers,
      this.mentionSequence,
    )
      .then(() => {})
      .catch((error) => {
        const errorMessage = error?.response?.data?.error_msg || error?.message || gettext('Failed to cache mention notifications.');
        toaster.danger(errorMessage);
      });
  };

  handleMentionAutocomplete = (args = {}) => {
    const searchText = typeof args.text === 'string' ? args.text : '';
    seafileAPI.listRepoRelatedUsers(repoID, searchText).then((response) => {
      const userList = response?.data?.user_list || [];
      const mentionList = userList
        .filter((user) => user.email !== window.app.pageOptions.username)
        .map((user) => ({
          username: user.email,
          label: user.name,
          profile: user.avatar_url || '',
        }));
      this.postMessageToOfficeFrame({
        MessageId: 'Action_Mention',
        Values: {
          list: mentionList,
        },
      });
    }).catch((error) => {
      const errorMessage = error?.response?.data?.error_msg || error?.message || gettext('Failed to load mention users.');
      toaster.danger(errorMessage);
    });
  };

  handleMentionSelected = (args = {}) => {
    const mentionedUser = args.username;
    if (!mentionedUser || mentionedUser === window.app.pageOptions.username) {
      return;
    }

    this.mentionedUsers.add(mentionedUser);
    this.cacheMentionNotifications(Array.from(this.mentionedUsers));
  };

  onMessage = (event) => {
    if (!actionOrigin || event.origin !== actionOrigin) return;

    let message = event.data;
    if (typeof message === 'string') {
      try {
        message = JSON.parse(message);
      } catch (error) {
        message = { MessageId: message };
      }
    }

    if (!message || !message.MessageId) return;

    if (message.MessageId === 'UI_Mention') {
      const mentionArgs = message.Values || message.args || {};
      if (mentionArgs.type === 'autocomplete') {
        this.handleMentionAutocomplete(mentionArgs);
      } else if (mentionArgs.type === 'selected') {
        this.handleMentionSelected(mentionArgs);
      }
      return;
    }

    if (message.MessageId === 'UI_SaveAs') {
      this.setState({
        isSaveAsDialogOpen: true,
        nextFileName: fileName,
      });
      return;
    }

    if (message.MessageId === 'Action_Save_Resp') {
      const { success } = message.Values || {};
      if (!success) return;

      const redirectUrl = getSaveAsRedirectURL({
        messageValues: message.Values,
        currentFileName: fileName,
        parentDir: window.app.pageOptions.parentDir,
        repoID,
        siteRoot,
      });
      this.navigateToSavedAsFile(redirectUrl);
      return;
    }

    if (message.MessageId === 'UI_Close') {
      return;
    }

    if (message.MessageId === 'App_LoadingStatus') {
      const { Status } = message.Values || {};
      if (Status === 'Document_Loaded') {
        this.postReadyMessage();
      }
    }
  };

  render() {
    if (err) {
      return <FileViewTip />;
    }

    return (
      <div className="file-view-content flex-1 p-0 border-0">
        <iframe title={fileName} id="office-frame" name="office_frame" className="d-none" allowFullScreen allow="clipboard-read *; clipboard-write *" onLoad={this.postReadyMessage}></iframe>
        <form id="office-form" name="office_form" target="office_frame" action={actionURL} method="post">
          <input name="access_token" value={accessToken} type="hidden" />
          <input name="access_token_ttl" value={accessTokenTtl} type="hidden" />
        </form>
        {this.state.isSaveAsDialogOpen && (
          <Modal isOpen={true} toggle={this.toggleSaveAsDialog} autoFocus={false}>
            <SeahubModalHeader toggle={this.toggleSaveAsDialog}>{gettext('Save As')}</SeahubModalHeader>
            <ModalBody>
              <Input
                value={this.state.nextFileName}
                onChange={this.onSaveAsFileNameChange}
                onKeyDown={this.onSaveAsKeyDown}
                autoFocus={true}
              />
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={this.toggleSaveAsDialog}>{gettext('Cancel')}</Button>
              <Button color="primary" onClick={this.submitSaveAs}>{gettext('Save')}</Button>
            </ModalFooter>
          </Modal>
        )}
      </div>
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<ViewFileCollaboraOnline />);
