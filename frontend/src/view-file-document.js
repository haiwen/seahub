import React from 'react';
import ReactDom from 'react-dom';
import { seafileAPI } from './utils/seafile-api';
import { gettext, mediaUrl } from './utils/constants';
import FileView from './components/file-view/file-view';
import FileViewTip from './components/file-view/file-view-tip';
import Loading from './components/loading';
import PDFViewer from './components/pdf-viewer';

import './css/pdf-file-view.css';

const {
  repoID, filePath, err,
  commitID, fileType
} = window.app.pageOptions;

class ViewFileDocument extends React.Component {
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

            let scriptNode = document.createElement('script');
            scriptNode.type = 'text/javascript';
            scriptNode.src = `${mediaUrl}js/pdf/web/viewer.js`;
            document.body.append(scriptNode);
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
      <div className="file-view-content flex-1 pdf-file-view">
        <PDFViewer />
      </div>
    );
  }
}

ReactDom.render(<ViewFileDocument />, document.getElementById('wrapper'));
