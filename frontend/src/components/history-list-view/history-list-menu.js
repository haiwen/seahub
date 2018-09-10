import React from 'react';
import URLDecorator from '../../utils/url-decorator';

const gettext = window.gettext;
const FILE_PATH = window.fileHistory.pageOptions.filePath;

class HistoryListMenu extends React.Component {

  onDownloadFile = () => {
    this.props.onDownloadFile();
  }

  onRestoreFile = () => {
    this.props.onRestoreFile();
  }

  render() {
    let style = {};
    let position = this.props.menuPosition;
    if (this.props.isListMenuShow) {
      style = {position: "fixed",left: position.left + 'px',top: position.top + 'px',display: 'block'};
    }
    
    let objID = this.props.currentItem.rev_file_id;
    let url = URLDecorator.getUrl({type: 'download_historic_file', filePath: FILE_PATH, objID: objID});
    
    if (this.props.isFirstItem) {
     return ( 
        <ul className="dropdown-menu" style={style}>
            <li className="dropdown-item" onClick={this.onDownloadFile}>
              <a href={url}>{gettext("Download")}</a>
            </li>
        </ul>
      )
    }

    return (
      <ul className="dropdown-menu" style={style}>
          <li className="dropdown-item" onClick={this.onRestoreFile}>{gettext("Restore")}</li>
          <li className="dropdown-item" onClick={this.onDownloadFile}>
            <a href={url}>{gettext("Download")}</a>
          </li>
      </ul>
    )
  }
    
}

export default HistoryListMenu;
