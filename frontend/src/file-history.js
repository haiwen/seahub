import React, { Fragment } from 'react';
import ReactDom from 'react-dom';
import axios from 'axios';
import { fileName, historyRepoID } from './utils/constants';
import { Utils } from './utils/utils';
import CommonToolbar from './components/toolbar/common-toolbar';
import SidePanel from './pages/file-history/side-panel';
import MainPanel from './pages/file-history/main-panel';
import { seafileAPI } from './utils/seafile-api';

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

  onSearchedClick = (searchedItem) => {
    Utils.handleSearchedItemClick(searchedItem);
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
      axios.all([
        seafileAPI.getFileRevision(historyRepoID, item.commit_id, item.path),
        seafileAPI.getFileRevision(historyRepoID, preItem.commit_id, preItem.path)
      ]).then(axios.spread((res, res1) => {
        axios.all([
          seafileAPI.getFileContent(res.data),
          seafileAPI.getFileContent(res1.data)
        ]).then(axios.spread((content1, content2) => {
          this.setDiffContent(content1.data, content2.data);
        }));
      }));
    } else {
      seafileAPI.getFileRevision(historyRepoID, item.commit_id, item.path).then((res) => {
        axios.all([
          seafileAPI.getFileContent(res.data),
        ]).then(axios.spread((content1) => {
          this.setDiffContent(content1.data, '');
        }));
      });
    }
  }

  onBackClick = (event) => {
    event.preventDefault();
    window.history.back();
  }

  render() {
    return(
      <Fragment>
        <div id="header" className="history-header">
          <div className="title">
            <a href="#" className="go-back" title="Back" onClick={this.onBackClick}>
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

ReactDom.render(<FileHistory />, document.getElementById('wrapper'));
