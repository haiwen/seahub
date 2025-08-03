import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';

const propTypes = {
  file: PropTypes.object.isRequired,
  onFileClick: PropTypes.func,
};

class BaiduNetdiskFileItem extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpIconShow: false,
      highlight: false,
    };
  }

  onMouseEnter = () => {
    this.setState({
      isOpIconShow: true,
      highlight: true,
    });
  };

  onMouseLeave = () => {
    this.setState({
      isOpIconShow: false,
      highlight: false
    });
  };

  onItemClick = () => {
    const { file, onFileClick } = this.props;
    if (onFileClick) {
      onFileClick(file);
    }
  };

  renderPCUI = () => {
    const { file } = this.props;
    const { highlight } = this.state;
    
    return (
      <tr 
        className={highlight ? 'tr-highlight' : ''} 
        onMouseEnter={this.onMouseEnter} 
        onMouseLeave={this.onMouseLeave}
      >
        <td>
          <img src={file.icon_url} alt="" width="24" height="24" />
        </td>
        <td>
          <div 
            className="text-truncate cursor-pointer d-flex align-items-center" 
            onClick={this.onItemClick}
            title={file.name}
          >
            <strong className={file.is_dir ? 'text-primary' : ''}>{file.name}</strong>
            {file.is_dir && (
              <i className="sf3-font-arrow-right ml-2 text-muted" style={{ fontSize: '12px' }}></i>
            )}
          </div>
        </td>
        <td>
          {file.is_dir ? '-' : file.size}
        </td>
        <td>{file.mtime || '-'}</td>
        <td>
          {/* 可以在这里添加操作按钮，如下载等 */}
        </td>
      </tr>
    );
  };

  renderMobileUI = () => {
    const { file } = this.props;
    const { highlight } = this.state;
    
    return (
      <tr 
        className={highlight ? 'tr-highlight' : ''} 
        onMouseEnter={this.onMouseEnter} 
        onMouseLeave={this.onMouseLeave}
        onClick={this.onItemClick}
      >
        <td>
          <img src={file.icon_url} alt="" width="24" height="24" />
        </td>
        <td>
          <div>
            <div className={`font-weight-bold d-flex align-items-center ${file.is_dir ? 'text-primary' : ''}`}>
              {file.name}
              {file.is_dir && (
                <i className="sf3-font-arrow-right ml-2 text-muted" style={{ fontSize: '12px' }}></i>
              )}
            </div>
            {!file.is_dir && (
              <div className="text-muted small">
                <span className="item-meta-info">{file.size}</span>
                <span className="item-meta-info">{file.mtime || '-'}</span>
              </div>
            )}
            {file.is_dir && (
              <div className="text-muted small">
                文件夹
              </div>
            )}
          </div>
        </td>
        <td>
          {/* 移动端操作菜单可以放在这里 */}
        </td>
      </tr>
    );
  };

  render() {
    return (
      <Fragment>
        <MediaQuery query="(min-width: 768px)">
          {this.renderPCUI()}
        </MediaQuery>
        <MediaQuery query="(max-width: 767.8px)">
          {this.renderMobileUI()}
        </MediaQuery>
      </Fragment>
    );
  }
}

BaiduNetdiskFileItem.propTypes = propTypes;

export default BaiduNetdiskFileItem;

