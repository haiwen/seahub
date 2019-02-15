import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import editUtilties from './utils/editor-utilties';
import { siteRoot, filePath, fileName } from './utils/constants';
import { Utils } from './utils/utils';
import URLDecorator from './utils/url-decorator';
import CommonToolbar from './components/toolbar/common-toolbar';
import SidePanel from './pages/file-history/side-panel';
import MainPanel from './pages/file-history/main-panel';

import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/layout.css';
import './css/file-history.css';
import './css/toolbar.css';
import './css/search.css';

class FileHistory extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      renderingContent: true,
      newMarkdownContent: '',
      oldMarkdownContent: ''
    };
  }

  onSearchedClick = (selectedItem) => {
    if (selectedItem.is_dir === true) {
      let url = siteRoot + 'library/' + selectedItem.repo_id + '/' + selectedItem.repo_name + selectedItem.path;
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    } else {
      let url = siteRoot + 'lib/' + selectedItem.repo_id + '/file' + Utils.encodePath(selectedItem.path);
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    }
  }

  setDiffContent = (newMarkdownContent, oldMarkdownContent)=> {
    this.setState({
      renderingContent: false,
      newMarkdownContent: newMarkdownContent,
      oldMarkdownContent: oldMarkdownContent,
    });
  }


  onHistoryItemClick = (item, preItem)=> {
    this.setState({renderingContent: true});
    if (preItem) {
      let currID = item.rev_file_id;
      let preID = preItem.rev_file_id;
      let downLoadURL = URLDecorator.getUrl({type: 'download_historic_file', filePath: filePath, objID: currID});
      let downLoadURL1 = URLDecorator.getUrl({type: 'download_historic_file', filePath: filePath, objID: preID});
      axios.all([
        editUtilties.getFileContent(downLoadURL),
        editUtilties.getFileContent(downLoadURL1)
      ]).then(axios.spread((res1, res2) => {
        this.setDiffContent(res1.data, res2.data);
      }));
    } else {
      let currID = item.rev_file_id;
      let downLoadURL = URLDecorator.getUrl({type: 'download_historic_file', filePath: filePath, objID: currID});
      axios.all([
        editUtilties.getFileContent(downLoadURL),
      ]).then(axios.spread((res1) => {
        this.setDiffContent(res1.data, '');
      }));
    }
  }

  render() {
    return(
      <Fragment>
        <div id="header" className="history-header">
          <div className="title">
            <a href="javascript:window.history.back()" className="go-back" title="Back">
              <span className="fas fa-chevron-left"></span>
            </a>
            <span className="name">{fileName}</span>
          </div>
          <div className='toolbar'>
            <CommonToolbar onSearchedClick={this.onSearchedClick} />
          </div>
        </div>
        <div id="main" className="history-content">
          <MainPanel 
            newMarkdownContent={this.state.newMarkdownContent}
            oldMarkdownContent={this.state.oldMarkdownContent}
            renderingContent={this.state.renderingContent}
          />
          <SidePanel onItemClick={this.onHistoryItemClick}/>
        </div>
      </Fragment>
    );
  }
}

ReactDOM.render (
  <FileHistory />,
  document.getElementById('wrapper')
);
