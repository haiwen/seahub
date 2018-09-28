import React from 'react';
import { gettext } from '../constants';
import OperationMenu from './operation-menu';

class OperationGroup extends React.Component {

  componentDidMount() {
    document.addEventListener('click', this.props.onItemMenuHide);
  }
  
  componentWillUnmount() {
    document.removeEventListener('click', this.props.onItemMenuHide);
  }

  onDownload = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.onDownload();
  }

  onShare = (e) => {
    //todos::
  }

  onDelete = (e) => {
    e.nativeEvent.stopImmediatePropagation(); //for document event
    this.props.onDelete();
  }

  onRename = () => {
    //todos:
  }

  onCopy = () => {
    //todos
  }

  render() {
    return (
      <div className="operation">
        <ul className="operation-group">
          <li className="operation-group-item">
            <i className="sf2-icon-download" title={gettext('Download')} onClick={this.onDownload}></i>
          </li>
          <li className="operation-group-item">
            <i className="sf2-icon-share" title={gettext('Share')} onClick={this.onShare}></i>
          </li>
          <li className="operation-group-item">
            <i className="sf2-icon-delete" title={gettext('Delete')} onClick={this.onDelete}></i>
          </li>
          <li className="operation-group-item">
            <i className="sf2-icon-caret-down sf-dropdown-toggle" title={gettext('More Operation')} onClick={this.props.onItemMenuShow}></i>
          </li>
        </ul>
        {
          this.props.isItemMenuShow && 
          <OperationMenu 
            currentItem={this.props.item}
            menuPosition={this.props.menuPosition}
            onRename={this.onRename}
            onCopy={this.onCopy}
          />
        }
      </div>
    );
  }
}

export default OperationGroup;
