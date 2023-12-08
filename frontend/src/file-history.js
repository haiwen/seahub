import React from 'react';
import ReactDom from 'react-dom';
import axios from 'axios';
import { fileName, historyRepoID } from './utils/constants';
import SidePanel from './pages/file-history/side-panel';
import MainPanel from './pages/file-history/main-panel';
import { seafileAPI } from './utils/seafile-api';

import './css/layout.css';
import './css/file-history.css';

class FileHistory extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      renderingContent: true,
      newMarkdownContent: '',
      oldMarkdownContent: ''
    };
  }

  setDiffContent = (newMarkdownContent, oldMarkdownContent)=> {
    this.setState({
      renderingContent: false,
      newMarkdownContent: newMarkdownContent,
      oldMarkdownContent: oldMarkdownContent,
    });
  };


  onHistoryItemClick = (item, preItem)=> {
    this.setState({renderingContent: true});
    seafileAPI.getFileRevision(historyRepoID, item.commit_id, item.path).then((res) => {
      axios.all([
        seafileAPI.getFileContent(res.data),
      ]).then(axios.spread((content1) => {
        this.setDiffContent(content1.data, '');
      }));
    });
  };

  onBackClick = (event) => {
    event.preventDefault();
    window.history.back();
  };

  render() {
    return (
      <div className="history-content flex-fill d-flex h-100">
        <div className="flex-fill d-flex flex-column">
          <div className="history-header file-history-header flex-shrink-0">
            <div className="title">
              <a href="#" className="go-back" title="Back" onClick={this.onBackClick}>
                <span className="fas fa-chevron-left"></span>
              </a>
              <span className="name">{fileName}</span>
            </div>
          </div>
          <MainPanel
            newMarkdownContent={this.state.newMarkdownContent}
            oldMarkdownContent={this.state.oldMarkdownContent}
            renderingContent={this.state.renderingContent}
          />
        </div>
        <SidePanel onItemClick={this.onHistoryItemClick}/>
      </div>
    );
  }
}

ReactDom.render(<FileHistory />, document.getElementById('wrapper'));
