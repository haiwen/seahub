import React from 'react';
import ReactDom from 'react-dom';
import { seafileAPI } from './utils/seafile-api';
import { siteRoot, gettext } from './utils/constants';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';
import Loading from './components/loading';

import './css/spreadsheet-file-view.css';

const {
  repoID, filePath, err,
  commitID, fileType, fileName, sharedToken
} = window.shared.pageOptions;

class SharedFileViewSpreadsheet extends React.Component {
  render() {
    return (
      <SharedFileView content={<FileContent />} />
    );
  }
}

class FileContent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: !err,
      errorMsg: ''
    };
  }

  componentDidMount() {
    if (err) {
      return;
    }

    let queryStatus = () => {
      seafileAPI.queryOfficeFileConvertStatus(repoID, commitID, filePath, fileType.toLowerCase(), sharedToken).then((res) => {
        const convertStatus = res.data['status'];
        switch (convertStatus) {
          case 'QUEUED':
          case 'PROCESSING':
            this.setState({
              isLoading: true
            });
            setTimeout(queryStatus, 2000);
            break;
          case 'ERROR':
            this.setState({
              isLoading: false,
              errorMsg: gettext('Document convertion failed.')
            });
            break;
          case 'DONE':
            this.setState({
              isLoading: false,
              errorMsg: ''
            });
        }
      }).catch((error) => {
        if (error.response) {
          this.setState({
            isLoading: false,
            errorMsg: gettext('Document convertion failed.')
          });
        } else {
          this.setState({
            isLoading: false,
            errorMsg: gettext('Please check the network.')
          });
        }
      });
    };

    queryStatus();
  }

  setIframeHeight = (e) => {
    const iframe = e.currentTarget;
    iframe.height = iframe.contentDocument.body.scrollHeight;
  }

  render() {
    const { isLoading, errorMsg } = this.state;

    if (err) {
      return <SharedFileViewTip />;
    }

    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <SharedFileViewTip errorMsg={errorMsg} />;
    }

    return (
      <div className="shared-file-view-body spreadsheet-file-view">
        <iframe id="spreadsheet-container" title={fileName} src={`${siteRoot}office-convert/static/${repoID}/${commitID}${encodeURIComponent(filePath)}/index.html?token=${sharedToken}`} onLoad={this.setIframeHeight}></iframe>
      </div>
    );
  }
}

ReactDom.render(<SharedFileViewSpreadsheet />, document.getElementById('wrapper'));
