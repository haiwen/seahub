import React from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import { fileName, historyRepoID } from './utils/constants';
import SidePanel from './pages/file-history/side-panel';
import MainPanel from './pages/file-history/main-panel';
import { seafileAPI } from './utils/seafile-api';
import { gettext } from '@/utils/constants';
import Icon from './components/icon';

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

  setDiffContent = (newMarkdownContent, oldMarkdownContent) => {
    this.setState({
      renderingContent: false,
      newMarkdownContent: newMarkdownContent,
      oldMarkdownContent: oldMarkdownContent,
    });
  };


  onHistoryItemClick = (item, preItem) => {
    this.setState({ renderingContent: true });
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
        <div className="flex-fill d-flex flex-column text-truncate">
          <div className="history-header file-history-header flex-shrink-0">
            <div className="title d-flex align-items-center mw-100">
              <a
                href="#"
                className="go-back d-flex align-items-center"
                title={gettext('Back')}
                onClick={this.onBackClick}
                role="button"
                aria-label={gettext('Back')}
              >
                <Icon symbol="arrow-down" className="rotate-90" />
              </a>
              <span className="name text-truncate" title={fileName}>{fileName}</span>
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

const root = createRoot(document.getElementById('wrapper'));
root.render(<FileHistory />);
