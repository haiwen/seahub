import React from 'react';
import { gettext } from '../../utils/constants';
import OperationMenu from './operation-menu';

class OperationGroup extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false,
      menuPosition: {top: 0, left: 0 },
    }
  }

  componentDidMount() {
    document.addEventListener('click', this.onItemMenuHide);
  }
  
  componentWillUnmount() {
    document.removeEventListener('click', this.onItemMenuHide);
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

  onItemMenuShow = (e) => {
    if (!this.state.isItemMenuShow) {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
  
      let left = e.clientX - 8*16;
      let top  = e.clientY + 15;
      let position = Object.assign({},this.state.menuPosition, {left: left, top: top});
      this.setState({
        menuPosition: position,
        isItemMenuShow: true,
      });
      this.props.onItemMenuShow();
    } else {
      this.onItemMenuHide();
    }
  }

  onItemMenuHide = () => {
    this.setState({
      isItemMenuShow: false,
    });
    this.props.onItemMenuHide();
  }

  onRename = () => {
    //todos:
  }

  onCopy = () => {
    //todos
  }

  render() {
    return (
      <div className="operations">
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
            <i className="sf2-icon-caret-down sf-dropdown-toggle" title={gettext('More Operation')} onClick={this.onItemMenuShow}></i>
          </li>
        </ul>
        {
          this.state.isItemMenuShow && 
          <OperationMenu 
            currentItem={this.props.item}
            menuPosition={this.state.menuPosition}
            onRename={this.onRename}
            onCopy={this.onCopy}
          />
        }
      </div>
    );
  }
}

export default OperationGroup;
