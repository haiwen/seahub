import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import OperationMenu from './operation-menu';

const propTypes = {
  dirent: PropTypes.object.isRequired,
  onItemMenuShow: PropTypes.func.isRequired,
  onItemMenuHide: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

class OperationGroup extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false,
      menuPosition: {top: 0, left: 0 },
    };
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

  onItemMenuToggle = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (!this.state.isItemMenuShow) {
      this.onItemMenuShow(e);
    } else {
      this.onItemMenuHide();
    }
  }

  onItemMenuShow = (e) => {
    let left = e.clientX - 8*16;
    let top  = e.clientY + 15;
    let position = Object.assign({},this.state.menuPosition, {left: left, top: top});
    this.setState({
      menuPosition: position,
      isItemMenuShow: true,
    });
    this.props.onItemMenuShow();
  }

  onItemMenuHide = () => {
    this.setState({
      isItemMenuShow: false,
    });
    this.props.onItemMenuHide();
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
            <i className="sf2-icon-caret-down sf-dropdown-toggle" title={gettext('More Operation')} onClick={this.onItemMenuToggle}></i>
          </li>
        </ul>
        {
          this.state.isItemMenuShow && 
          <OperationMenu 
            dirent={this.props.dirent}
            menuPosition={this.state.menuPosition}
            onMenuItemClick={this.props.onMenuItemClick}
          />
        }
      </div>
    );
  }
}

OperationGroup.propTypes = propTypes;

export default OperationGroup;
