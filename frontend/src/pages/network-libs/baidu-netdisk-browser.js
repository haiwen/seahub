import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Loading from '../../components/loading';
import BaiduNetdiskFileItem from './baidu-netdisk-file-item';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../../components/toast';

const propTypes = {
  initialPath: PropTypes.string,
  onBack: PropTypes.func.isRequired,
};

class BaiduNetdiskBrowser extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      files: [],
      currentPath: props.initialPath || '/',
      breadcrumbs: [],
      hasMore: false,
      cursor: ''
    };
  }

  componentDidMount() {
    this.loadFiles(this.state.currentPath);
  }

  loadFiles = (path = '/') => {
    this.setState({ loading: true, errorMsg: '' });
    
    console.log('🔍 [DEBUG] 开始加载百度网盘文件, 路径:', path);
    
    seafileAPI.getBaiduNetdiskFiles(path, 0, 1000).then((response) => {
      console.log('✅ [DEBUG] API响应成功:', response);
      console.log('📁 [DEBUG] 响应数据:', response.data);
      
      const { files, current_path, breadcrumbs, has_more, cursor } = response.data;
      
      console.log('📋 [DEBUG] 解析的文件列表:', files);
      console.log('🗂️ [DEBUG] 当前路径:', current_path);
      console.log('🍞 [DEBUG] 面包屑:', breadcrumbs);
      
      this.setState({
        loading: false,
        files: files || [],
        currentPath: current_path,
        breadcrumbs: breadcrumbs || [],
        hasMore: has_more || false,
        cursor: cursor || ''
      });
      
      console.log('🔄 [DEBUG] 状态更新完成, 文件数量:', (files || []).length);
    }).catch((error) => {
      console.error('❌ [DEBUG] 获取百度网盘文件列表失败:', error);
      console.error('📄 [DEBUG] 错误响应:', error.response);
      
      let errorMsg = '获取文件列表失败';
      if (error.response && error.response.data && error.response.data.error_msg) {
        errorMsg = error.response.data.error_msg;
      }
      this.setState({
        loading: false,
        errorMsg: errorMsg,
        files: []
      });
    });
  };

  onFileClick = (file) => {
    if (file.is_dir) {
      // 如果是目录，进入该目录
      this.loadFiles(file.path);
    } else {
      // 如果是文件，暂时显示提示
      toaster.info(`文件预览功能开发中: ${file.name}`);
    }
  };

  onBreadcrumbClick = (breadcrumb) => {
    if (breadcrumb.path !== this.state.currentPath) {
      this.loadFiles(breadcrumb.path);
    }
  };

  render() {
    const { loading, errorMsg, files, breadcrumbs } = this.state;
    
    // 调试信息
    const debugInfo = {
      loading,
      errorMsg,
      filesCount: files ? files.length : 'null',
      filesType: typeof files,
      breadcrumbsCount: breadcrumbs ? breadcrumbs.length : 'null',
      currentPath: this.state.currentPath
    };
    console.log('🎯 [DEBUG] 组件渲染状态:', debugInfo);

    if (loading) {
      return (
        <div className="main-panel-center">
          <div className="cur-view-container">
            <Loading />
          </div>
        </div>
      );
    }

    if (errorMsg) {
      return (
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading m-0 d-flex align-items-center">
                <button 
                  className="btn btn-link p-0 mr-2" 
                  onClick={this.props.onBack}
                  title="返回网络库列表"
                >
                  <i className="sf3-font-arrow-left sf3-font" style={{ fontSize: '20px' }}></i>
                </button>
                百度网盘
              </h3>
            </div>
            <div className="cur-view-content">
              <div className="error-msg text-center">
                {errorMsg}
                <div className="mt-3">
                  <button 
                    className="btn btn-primary" 
                    onClick={() => this.loadFiles(this.state.currentPath)}
                  >
                    重试
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="main-panel-center">
        <div className="cur-view-container">
          <div className="cur-view-path">
            <h3 className="sf-heading m-0 d-flex align-items-center">
              <button 
                className="btn btn-link p-0 mr-2" 
                onClick={this.props.onBack}
                title="返回网络库列表"
              >
                <i className="sf3-font-arrow-left sf3-font" style={{ fontSize: '20px' }}></i>
              </button>
              百度网盘
            </h3>
            {breadcrumbs.length > 0 && (
              <nav className="breadcrumb-nav mt-2">
                <ol className="breadcrumb">
                  {breadcrumbs.map((breadcrumb, index) => (
                    <li 
                      key={index} 
                      className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
                    >
                      {index === breadcrumbs.length - 1 ? (
                        breadcrumb.name
                      ) : (
                        <button 
                          className="btn btn-link p-0" 
                          onClick={() => this.onBreadcrumbClick(breadcrumb)}
                        >
                          {breadcrumb.name}
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>
          <div className="cur-view-content">
            {files.length === 0 ? (
              <div className="empty-tip text-center">
                <h4>该目录为空</h4>
                <p>当前目录中没有文件或文件夹</p>
                <div className="mt-2 text-muted small">
                  调试信息: 文件数组长度 = {files.length}
                </div>
              </div>
            ) : (
              <table className="table table-hover table-vcenter">
                <thead>
                  <tr>
                    <th width="5%"></th>
                    <th width="45%">名称</th>
                    <th width="15%">大小</th>
                    <th width="25%">修改时间</th>
                    <th width="10%"></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file, index) => (
                    <BaiduNetdiskFileItem
                      key={file.fs_id || index}
                      file={file}
                      onFileClick={this.onFileClick}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }
}

BaiduNetdiskBrowser.propTypes = propTypes;

export default BaiduNetdiskBrowser;

