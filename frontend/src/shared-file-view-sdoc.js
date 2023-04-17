import React from 'react';
import ReactDom from 'react-dom';
import { SDocViewer } from '@seafile/sdoc-editor';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import { defaultContentForSDoc } from './utils/constants';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';
import Loading from './components/loading';
import toaster from './components/toast';

import './css/sdoc-file-view.css';

const { rawPath, err } = window.shared.pageOptions;

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
        content: res.data || defaultContentForSDoc,
        loading: false
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    const { loading, content } = this.state;
    if (err) {
      return <SharedFileViewTip />;
    }

    if (loading) {
      return <Loading />;
    }

    return (
      <div className="shared-file-view-body d-flex flex-column sdoc-file-view p-0">
        {content && <SDocViewer document={content} config={{}} />}
      </div>
    );
  }
}

ReactDom.render(<SharedFileViewSdoc />, document.getElementById('wrapper'));
