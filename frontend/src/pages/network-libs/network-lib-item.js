import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import { Link } from '@gatsbyjs/reach-router';
import { gettext, siteRoot } from '../../utils/constants';

const propTypes = {
  networkLib: PropTypes.object.isRequired,
  onItemClick: PropTypes.func,
};

class NetworkLibItem extends React.Component {
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
    const { networkLib, onItemClick } = this.props;
    if (onItemClick) {
      onItemClick(networkLib);
    }
  };

  renderPCUI = () => {
    const { networkLib } = this.props;
    const { highlight } = this.state;
    
    return (
      <tr 
        className={highlight ? 'tr-highlight' : ''} 
        onMouseEnter={this.onMouseEnter} 
        onMouseLeave={this.onMouseLeave}
      >
        <td className="text-center">
          <i className="op-icon m-0 sf3-font-star-empty sf3-font"></i>
        </td>
        <td>
          {networkLib.icon_type === 'image' ? (
            <img src={networkLib.icon} alt={networkLib.name} width="24" height="24" />
          ) : (
            <i className={`${networkLib.icon} sf3-font`} style={{ fontSize: '24px' }}></i>
          )}
        </td>
        <td>
          <div 
            className="text-truncate cursor-pointer" 
            onClick={this.onItemClick}
            title={networkLib.name}
          >
            <strong>{networkLib.name}</strong>
            {networkLib.user_name && (
              <span className="text-muted ml-2">({networkLib.user_name})</span>
            )}
          </div>
          {networkLib.description && (
            <small className="text-muted d-block">{networkLib.description}</small>
          )}
          {networkLib.usage_percent !== undefined && networkLib.usage_percent > 0 && (
            <div className="mt-1">
              <small className="text-muted">
                已使用: {networkLib.used_size} / {networkLib.size} ({networkLib.usage_percent}%)
              </small>
              <div className="progress mt-1" style={{ height: '4px' }}>
                <div 
                  className="progress-bar" 
                  role="progressbar" 
                  style={{ width: `${networkLib.usage_percent}%` }}
                  aria-valuenow={networkLib.usage_percent} 
                  aria-valuemin="0" 
                  aria-valuemax="100"
                >
                </div>
              </div>
            </div>
          )}
        </td>
        <td>
          <span className={`badge ${networkLib.status === 'connected' ? 'badge-success' : 'badge-secondary'}`}>
            {networkLib.status === 'connected' ? '已连接' : '未连接'}
          </span>
        </td>
        <td>{networkLib.size}</td>
        <td>{networkLib.last_modified || '-'}</td>
      </tr>
    );
  };

  renderMobileUI = () => {
    const { networkLib } = this.props;
    const { highlight } = this.state;
    
    return (
      <tr 
        className={highlight ? 'tr-highlight' : ''} 
        onMouseEnter={this.onMouseEnter} 
        onMouseLeave={this.onMouseLeave}
      >
        <td onClick={this.onItemClick}>
          {networkLib.icon_type === 'image' ? (
            <img src={networkLib.icon} alt={networkLib.name} width="24" height="24" />
          ) : (
            <i className={`${networkLib.icon} sf3-font`} style={{ fontSize: '24px' }}></i>
          )}
        </td>
        <td onClick={this.onItemClick}>
          <div>
            <div className="font-weight-bold">
              {networkLib.name}
              {networkLib.user_name && (
                <small className="text-muted ml-2">({networkLib.user_name})</small>
              )}
            </div>
            <span className="item-meta-info">{networkLib.size}</span>
            {networkLib.usage_percent !== undefined && networkLib.usage_percent > 0 && (
              <span className="item-meta-info">已使用 {networkLib.usage_percent}%</span>
            )}
            <span className="item-meta-info">{networkLib.last_modified || '-'}</span>
            <div className="mt-1">
              <span className={`badge badge-sm ${networkLib.status === 'connected' ? 'badge-success' : 'badge-secondary'}`}>
                {networkLib.status === 'connected' ? '已连接' : '未连接'}
              </span>
            </div>
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

NetworkLibItem.propTypes = propTypes;

export default NetworkLibItem;

