import React from 'react';
import ReactDom from 'react-dom';
import PropTypes from 'prop-types';
import { NewEditor } from '@seafile/sdoc-editor';
import { Utils } from './utils/utils';
import { gettext } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import toaster from './components/toast';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';

import './css/sdoc-file-view.css';

const {
  err, repoID, filePath, fileName, username
} = window.app.pageOptions;

const propTypes = {
  updateContent: PropTypes.func.isRequired,
  content: PropTypes.array,
  errorMsg: PropTypes.string
};

const defaultContent = [{type: 'paragraph', children: [{ text: '' }]}];

class FileContent extends React.Component {

  render() {
    const { content, errorMsg } = this.props;

    if (err) {
      return <FileViewTip />;
    }
    if (errorMsg) {
      return <FileViewTip errorMsg={errorMsg} />;
    }

    return (
      <div className="file-view-content flex-1 sdoc-file-view p-0">
        {content && <NewEditor value={content} onValueChanged={this.props.updateContent} />}
      </div>
    );
  }
}

FileContent.propTypes = propTypes;


class ViewFileSdoc extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      needSave: false,
      isSaving: false,
      participants: []
    };
    this.isParticipant = false;
  }

  componentDidMount() {
    this.getParticipants();
    seafileAPI.getFileDownloadLink(repoID, filePath).then(res => {
      seafileAPI.getFileContent(res.data).then(res => {
        const content = res.data || defaultContent;
        this.setState({
          content: content
        });
      }).catch((error) => {
        this.setState({
          errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
        });
      });
    });
  }

  updateContent = (value) => {
    this.setState({
      needSave: true,
      content: value
    });
  }

  onSave = () => {
    if (!this.isParticipant) {
      this.addParticipant();
    }
    const dirPath = '/';
    seafileAPI.getUpdateLink(repoID, dirPath).then((res) => {
      const uploadLink = res.data;
      this.setState({
        isSaving: true
      });
      seafileAPI.updateFile(uploadLink, filePath, fileName,
        JSON.stringify(this.state.content)
      ).then(() => {
        toaster.success(gettext('Successfully saved'), {
          duration: 2
        });
        this.setState({
          isSaving: false,
          needSave: false
        });
      }).catch((error) => {
        const message = gettext('Failed to save');
        toaster.danger(message, { duration: 2 });
        this.setState({
          isSaving: false,
          needSave: false
        });
      });
    }).catch((error) => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }

  addParticipant = () => {
    seafileAPI.addFileParticipants(repoID, filePath, [username]).then((res) => {
      this.isParticipant = true;
      this.getParticipants();
    });
  }

  getParticipants = () => {
    seafileAPI.listFileParticipants(repoID, filePath).then((res) => {
      const participants = res.data.participant_list;
      this.setState({ participants: participants });
      if (participants.length > 0) {
        this.isParticipant = participants.every((participant) => {
          return participant.email == username;
        });
      }
    });
  }

  onParticipantsChange = () => {
    this.getParticipants();
  }

  render() {
    return (
      <FileView
        content={
          <FileContent
            content={this.state.content}
            updateContent={this.updateContent}
            errorMsg={this.state.errorMsg}
          />
        }
        isSaving={this.state.isSaving}
        needSave={this.state.needSave}
        onSave={this.onSave}
        participants={this.state.participants}
        onParticipantsChange={this.onParticipantsChange}
      />
    );
  }
}

ReactDom.render(<ViewFileSdoc />, document.getElementById('wrapper'));
