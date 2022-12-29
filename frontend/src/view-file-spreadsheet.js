import React from 'react';
import ReactDom from 'react-dom';
import { seafileAPI } from './utils/seafile-api';
import { siteRoot, gettext } from './utils/constants';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';
import Loading from './components/loading';

import './css/spreadsheet-file-view.css';

const {
  repoID, filePath, err,
  commitID, fileType, fileName
} = window.app.pageOptions;

class ViewFileSpreadsheet extends React.Component {
  render() {
    return (
      <FileView content={<FileContent />} />
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
      seafileAPI.queryOfficeFileConvertStatus(repoID, commitID, filePath, fileType.toLowerCase()).then((res) => {
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
      return <FileViewTip />;
    }

    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <FileViewTip errorMsg={errorMsg} />;
    }

    return (
      <div className="file-view-content flex-1 spreadsheet-file-view">
        <iframe id="spreadsheet-container" title={fileName} src={`${siteRoot}office-convert/static/${repoID}/${commitID}${encodeURIComponent(filePath)}/index.html`} onLoad={this.setIframeHeight}></iframe>
      </div>
    );
  }
}

ReactDom.render(<ViewFileSpreadsheet />, document.getElementById('wrapper'));
