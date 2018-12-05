import React from 'react';
import ReactDOM from 'react-dom';
import editUtilties from './utils/editor-utilties';
import { filePath } from './utils/constants';
import URLDecorator from './utils/url-decorator';
import SidePanel from './pages/file-history/side-panel';
import MainPanel from './pages/file-history/main-panel';
import axios from 'axios';
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
      content: '',
      renderingContent: true,
      fileOwner: '',
      markdownContent: '',
      markdownContentOld: ''
    };
  }


  setDiffContent = (markdownContent, markdownContentOld)=> {
    this.setState({
      renderingContent: false,
      markdownContent: markdownContent,
      markdownContentOld: markdownContentOld
    });
  }


  onHistoryItemClick = (item, preCommitID)=> {
    let objID = item.rev_file_id;
    let downLoadURL = URLDecorator.getUrl({type: 'download_historic_file', filePath: filePath, objID: objID});
    let downLoadURL1 = URLDecorator.getUrl({type: 'download_historic_file', filePath: filePath, objID: preCommitID});
    this.setState({renderingContent: true});
    axios.all([
      editUtilties.getFileContent(downLoadURL),
      editUtilties.getFileContent(downLoadURL1)
    ]).then(axios.spread((res1, res2) => {
      this.setDiffContent(res1.data, res2.data);
    }));
  }

  render() {
    return(
      <div id="main" className="history-main">
        <SidePanel 
          fileOwner={this.state.fileOwner}
          onHistoryItemClick={this.onHistoryItemClick}
          setDiffContent={this.setDiffContent}
        />
        <MainPanel 
          markdownContent={this.state.markdownContent}
          markdownContentOld={this.state.markdownContentOld}
          renderingContent={this.state.renderingContent}
        />

      </div>
    );
  }
}

ReactDOM.render (
  <FileHistory />,
  document.getElementById('wrapper')
);
