import React from 'react';
import ReactDom from 'react-dom';
import PropTypes from 'prop-types';
import Url from 'url-parse';
import axios from 'axios';
import { SDocEditor } from '@seafile/sdoc-editor';
import { Utils } from './utils/utils';
import { defaultContentForSDoc } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';

import './css/sdoc-file-view.css';

const {
  err, repoID, filePath, username,
  docPath,
  docName,
  docUuid,
  seadocAccessToken,
  seadocServerUrl
} = window.app.pageOptions;

const propTypes = {
  content: PropTypes.object,
  errorMsg: PropTypes.string
};

const config = {
  docPath: docPath,
  docName: docName,
  docUuid: docUuid,
  sdocServer: (new Url(seadocServerUrl)).origin,
  accessToken: seadocAccessToken
};

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
      <div className="file-view-content flex-1 sdoc-file-view p-0 d-flex flex-column">
        {content && <SDocEditor
          document={content}
          config={config}
          isOpenSocket={true}
          onValueChanged={() => {}}
        />}
      </div>
    );
  }
}

FileContent.propTypes = propTypes;

class ViewFileSdoc extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      participants: []
    };
    this.isParticipant = false;
  }

  getFileContent = () => {
    const {
      docPath,
      docName,
      docUuid,
      accessToken
    } = config;

    const url = `${seadocServerUrl}/api/v1/docs/${docUuid}/?doc_path=${encodeURIComponent(docPath)}&doc_name=${encodeURIComponent(docName)}`;
    return axios.get(url, {headers: {Authorization: `Token ${accessToken}`}});
  }

  componentDidMount() {
    this.getParticipants();

    this.getFileContent().then(res => {
      const content = res.data || defaultContentForSDoc;
      this.setState({
        content: content
      });
    }).catch((error) => {
      this.setState({
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
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
            errorMsg={this.state.errorMsg}
          />
        }
        participants={this.state.participants}
        onParticipantsChange={this.onParticipantsChange}
      />
    );
  }
}

ReactDom.render(<ViewFileSdoc />, document.getElementById('wrapper'));
