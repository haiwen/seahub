import React from 'react';
import PropTypes from 'prop-types';
import { gettext, filePath } from '../constance';
import URLDecorator from '../../utils/url-decorator';

const propTypes = {
  isFirstItem: PropTypes.bool.isRequired,
  isListMenuShow: PropTypes.bool.isRequired,
  menuPosition: PropTypes.object.isRequired,
  currentItem: PropTypes.object,
  onDownloadFile: PropTypes.func.isRequired,
  onRestoreFile: PropTypes.func.isRequired,
};

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
      style = {position: 'fixed',left: position.left + 'px',top: position.top + 'px',display: 'block'};
    }
    
    if (!this.props.currentItem) {
      return '';
    }

    let objID = this.props.currentItem.rev_file_id;
    let url = URLDecorator.getUrl({type: 'download_historic_file', filePath: filePath, objID: objID});
    
    if (this.props.isFirstItem) {
      return ( 
        <ul className="dropdown-menu" style={style}>
          <li className="dropdown-item" onClick={this.onDownloadFile}>
            <a href={url}>{gettext('Download')}</a>
          </li>
        </ul>
      );
    }

    return (
      <ul className="dropdown-menu" style={style}>
        <li className="dropdown-item" onClick={this.onRestoreFile}>{gettext('Restore')}</li>
        <li className="dropdown-item" onClick={this.onDownloadFile}>
          <a href={url}>{gettext('Download')}</a>
        </li>
      </ul>
    );
  }
    
}

HistoryListMenu.propTypes = propTypes;

export default HistoryListMenu;
