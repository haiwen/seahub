import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import { Utils } from './utils/utils';
import { seafileAPI } from './utils/seafile-api';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './utils/constants';
import Loading from './components/loading';
import FileViewTip from './components/file-view/file-view-tip';
import Account from './components/common/account';
import AudioPlayer from './components/audio-player';
import MarkdownViewer from '@seafile/seafile-editor/dist/viewer/markdown-viewer';
import PDFViewer from './components/pdf-viewer';
import CodeMirror from 'react-codemirror';
import VideoPlayer from './components/video-player';

import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/css/css';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/php/php';
import 'codemirror/mode/sql/sql';
import 'codemirror/mode/vue/vue';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/go/go';
import 'codemirror/mode/python/python';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/lib/codemirror.css';
import './css/text-file-view.css';
import './css/shared-file-view.css';

let loginUser = window.app.pageOptions.name;
const {
  fileType, fileExt, rawPath, fileContent, err, fileName, filePath, repoID, commitID
} = window.app.pageOptions;

const options = {
  lineNumbers: true,
  mode: Utils.chooseLanguage(fileExt),
  extraKeys: {'Ctrl': 'autocomplete'},
  theme: 'default',
  textWrapping: true,
  lineWrapping: true,
  readOnly: true,
  cursorBlinkRate: -1,
};

class FileContent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: !err,
      errorMsg: '',
    };
  }

  componentDidMount() {
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
            if (fileType === 'Document') {
              let scriptNode = document.createElement('script');
              scriptNode.type = 'text/javascript';
              scriptNode.src = `${mediaUrl}js/pdf/viewer.js`;
              document.body.append(scriptNode);            
            }
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
    if (isLoading) {
      return <Loading />;
    }
    if (errorMsg) {
      return <FileViewTip errorMsg={errorMsg} />;
    }
    return (
      <Fragment>
        { fileType === 'Document' && 
          <div className="shared-file-view-body pdf-file-view">
            <PDFViewer />
          </div> }
        { fileType === 'SpreadSheet' &&
          <div className="shared-file-view-body spreadsheet-file-view">
            <iframe id="spreadsheet-container" title={fileName} src={`${siteRoot}office-convert/static/${repoID}/${commitID}${encodeURIComponent(filePath)}/index.html`} onLoad={this.setIframeHeight}></iframe>
          </div> }
      </Fragment>
    );
  }
}

class DTableAssetFileView extends React.Component {

  render() {
    if (err) {
      return (
        <FileViewTip errorMsg={err} />
      );
    }

    let renderItem;
    switch (fileType) {
      case 'Audio':
        renderItem = (
          <div className="shared-file-view-body d-flex">
            <div className="flex-1">
              <AudioPlayer
                autoplay={false}
                controls={true}
                preload="auto"
                sources={[{
                  src: rawPath
                }]}
              />
            </div>
          </div>
        );
        break;
      case 'Document':
      case 'SpreadSheet':
        renderItem = (
          <FileContent />
        );
        break;
      case 'Image':
        renderItem = (
          <div className="shared-file-view-body d-flex text-center">
            <div className="image-file-view flex-1">
              <img src={rawPath} alt={fileName} id="image-view" />
            </div>
          </div>
        );
        break;
      case 'Markdown':
        renderItem = (
          <div className="shared-file-view-body">
            <div className="md-view">
              <MarkdownViewer
                markdownContent={fileContent}
                showTOC={false}
              />          
            </div>
          </div>
        );
        break;
      case 'PDF':
        renderItem = (
          <div className="shared-file-view-body pdf-file-view">
            <PDFViewer />
          </div>
        );
        break;
      case 'SVG':
        renderItem = (
          <div className="shared-file-view-body d-flex">
            <div className="svg-file-view flex-1">
              <img src={rawPath} alt={fileName} id="svg-view" />
            </div>
          </div>
        );
        break;
      case 'Text':
        renderItem = (
          <div className="shared-file-view-body text-file-view">
            <CodeMirror
              ref="code-mirror-editor"
              value={fileContent}
              options={options}
            />
          </div>
        );
        break;
      case 'Video':
        renderItem = (
          <div className="shared-file-view-body d-flex">
            <div className="flex-1">
              <VideoPlayer
                autoplay={false}
                controls={true}
                preload="auto"
                sources={[{
                  src: rawPath
                }]}
              />
            </div>
          </div>
        );
        break;
      default:
        renderItem = (
          <FileViewTip err='File preview unsupported'/>
        );
    }

    return (
      <div className="shared-file-view-md">
        <div className="shared-file-view-md-header d-flex">
          <a href={siteRoot}>
            <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
          </a>
          { loginUser && <Account /> }
        </div>
        <div className="shared-file-view-md-main">
          <div className="shared-file-view-head">
            <div className="float-left">
              <h2 className="ellipsis" title={fileName}>{fileName}</h2>
            </div>
          </div>
          {renderItem}
        </div>
      </div>
    );
  }
}

ReactDOM.render (
  <DTableAssetFileView />,
  document.getElementById('wrapper')
);
