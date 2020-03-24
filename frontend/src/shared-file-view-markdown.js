import React from 'react';
import ReactDOM from 'react-dom';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import { serviceURL } from './utils/constants';
import SharedFileView from './components/shared-file-view/shared-file-view';
import SharedFileViewTip from './components/shared-file-view/shared-file-view-tip';
import Loading from './components/loading';
import MarkdownViewer from '@seafile/seafile-editor/dist/viewer/markdown-viewer';
import toaster from './components/toast';

const { repoID, sharedToken, rawPath, err } = window.shared.pageOptions;

class SharedFileViewMarkdown extends React.Component {
  render() {
    return <SharedFileView content={<FileContent />} />;
  }
}

class FileContent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      markdownContent: '',
      loading: !err
    };
  }

  componentDidMount() {
    seafileAPI.getFileContent(rawPath).then((res) => {
      this.setState({
        markdownContent: res.data,
        loading: false
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  changeImageURL = (innerNode) => {
    if (innerNode.type == 'image') {
      let imageUrl = innerNode.data.src;

      const re = new RegExp(serviceURL + '/lib/' + repoID +'/file.*raw=1');
      
      // different repo 
      if (!re.test(imageUrl)) {
        return;
      }
      // get image path
      let imagePath = imageUrl.substring(serviceURL.length);
      let index = imagePath.indexOf('/file');
      let index2 = imagePath.indexOf('?');
      imagePath = imagePath.substring(index + 5, index2);
      // change image url
      innerNode.data.src = serviceURL + '/view-image-via-share-link/?token=' + sharedToken + '&path=' + imagePath;
    }
    return innerNode;
  }

  modifyValueBeforeRender = (value) => {
    let nodes = value.document.nodes;
    let newNodes = Utils.changeMarkdownNodes(nodes, this.changeImageURL);
    value.document.nodes = newNodes;
    return value;
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
          <MarkdownViewer 
            markdownContent={this.state.markdownContent}
            showTOC={false}
            serviceURL={serviceURL}
            sharedToken={sharedToken}
            repoID={repoID}
            modifyValueBeforeRender={this.modifyValueBeforeRender}
          />
        </div>
      </div>
    );
  }
}

ReactDOM.render (
  <SharedFileViewMarkdown />,
  document.getElementById('wrapper')
);
