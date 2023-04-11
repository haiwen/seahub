import React from 'react';
import ReactDom from 'react-dom';
import { MarkdownViewer } from '@seafile/seafile-editor';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import { serviceURL, mediaUrl } from './utils/constants';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';
import Loading from './components/loading';
import toaster from './components/toast';

const { repoID, sharedToken, rawPath, err } = window.shared.pageOptions;
const defaultContent = [{type: 'paragraph', children: [{ text: '' }]}];

class SharedFileViewSdoc extends React.Component {
  render() {
    return <SharedFileView content={<FileContent />} />;
  }
}

class FileContent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: !err
    };
  }

  componentDidMount() {
    seafileAPI.getFileContent(rawPath).then((res) => {
      this.setState({
        content: res.data || defaultContent,
        loading: false
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    if (err) {
      return <SharedFileViewTip />;
    }

    if (this.state.loading) {
      return <Loading />;
    }

    return (
      <div className="shared-file-view-body">
        <div className="md-view">
        </div>
      </div>
    );
  }
}

ReactDom.render(<SharedFileViewSdoc />, document.getElementById('wrapper'));
