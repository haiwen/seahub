import React from 'react';
import editUtilties from '../utils/editor-utilties';
import { filePath } from '../components/constance';
import { processor } from '@seafile/seafile-editor/src/lib/seafile-markdown2html';
import SidePanel from './filehistory/side-panel';
import MainPanel from './filehistory/main-panel';
import 'seafile-ui';
import '../assets/css/fa-solid.css';
import '../assets/css/fa-regular.css';
import '../assets/css/fontawesome.css';
import '../css/layout.css';
import '../css/file-history.css'

class FileHistory extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      content: '',
      renderingContent: true,
      fileOwner: '',
    }
  }

  componentDidMount() {
    let _this = this;
    editUtilties.getFileDownloadLink(filePath).then(res => {
      const downLoadUrl = res.data;
      editUtilties.getFileContent(downLoadUrl).then((res) => {
        let content = res.data;
        processor.process(content, function(err, file) {
          _this.setState({
            renderingContent: false,
            content: String(file)
          })
        })
      })
    })
  }

  onHistoryItemClick = (item) => {
    //todos;
  }

  render() {
    return(
      <div id="main" className="history-main">
        <SidePanel 
          fileOwner={this.state.fileOwner}
          onHistoryItemClick={this.onHistoryItemClick}
        />
        <MainPanel 
          content={this.state.content}
          renderingContent={this.state.renderingContent}
        />
      </div>
    );
  }
}

export default FileHistory;
