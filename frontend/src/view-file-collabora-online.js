import React from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Input, Modal, ModalBody, ModalFooter } from 'reactstrap';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';
import { gettext, siteRoot } from './utils/constants';
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
