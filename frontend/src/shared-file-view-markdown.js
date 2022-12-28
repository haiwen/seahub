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

class SharedFileViewMarkdown extends React.Component {
  render() {
    return <SharedFileView content={<FileContent />} fileType="md" />;
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
      // the image path has been encoded when inserting the image
      innerNode.data.src = serviceURL + '/view-image-via-share-link/?token=' + sharedToken + '&path=' + imagePath;
    }
    return innerNode;
  }

  modifyValueBeforeRender = (value) => {
    return Utils.changeMarkdownNodes(value, this.changeImageURL);
  }

  updateForNoOutline = () => {
    const $outline = document.querySelector('.md-view .seafile-markdown-outline');
    const $main = document.querySelector('.md-view .article');
    $outline.className += ' d-none';
    $main.className += ' article-no-outline';
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
            scriptSource={mediaUrl + 'js/mathjax/tex-svg.js'}
            markdownContent={this.state.markdownContent}
            showTOC={true}
            updateForNoOutline={this.updateForNoOutline}
            activeTitleIndex={''}
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

ReactDom.render(<SharedFileViewMarkdown />, document.getElementById('wrapper'));
