import React from "react";
import { gettext, repoID } from '../constants';
import editorUtilities from '../../utils/editor-utilties';
import URLDecorator from '../../utils/url-decorator';
import DownloadDialog from '../dialog/download-dialog';
import TreeDirList from './tree-dir-list'
import "../../css/common.css";

class TreeDirView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isProgressDialogShow: false,
      progress: '0%'
    };
    this.zip_token = null;
    this.interval = null;
  }

  onDownload = (item) => {
    if (item.isDir()) {
      this.setState({isProgressDialogShow: true, progress: '0%'});
      editorUtilities.zipDownload(item.parent_path, item.name).then(res => {
        this.zip_token = res.data['zip_token'];
        //获取进度
        this.addDownLoadAnimation();
        this.interval = setInterval(this.addDownLoadAnimation, 1000);
      });
    } else {
      let url = URLDecorator.getUrl({type:'download_file_url', repoID: repoID, filePath: item.path});
      location.href = url;
    }
  }

  addDownLoadAnimation = () => {
    let _this = this;
    let token = this.zip_token;
    editorUtilities.queryZipProgress(token).then(res => {
      let data = res.data;
      let progress = data.total === 0 ? '100%' : (data.zipped / data.total * 100).toFixed(0) + '%';
      this.setState({progress: progress});

      if (data['total'] === data['zipped']) {
        this.setState({
          progress: '100%'
        });
        clearInterval(this.interval);
        location.href = URLDecorator.getUrl({type: 'download_dir_zip_url', token: token});
        setTimeout(function() {
          _this.setState({isProgressDialogShow: false});
        }, 500);
      }

    });
  }

  onCancelDownload = () => {
    let zip_token = this.zip_token;
    editorUtilities.cancelZipTask(zip_token).then(res => {
      this.setState({
        isProgressDialogShow: false,
      });
    })
  }

  render() {
    let node = this.props.node;
    let children = node.hasChildren() ? node.children : null;

    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{width: "4%"}}></th>
              <th style={{width: "46%"}}>{gettext('Name')}</th>
              <th style={{width: "20%"}}></th>
              <th style={{width: "15%"}}>{gettext('Size')}</th>
              <th style={{width: "15%"}}>{gettext('Last Update')}</th>
            </tr>
          </thead>
          <tbody>
            {children && children.map((node, index) => {
              return (
                <TreeDirList 
                  key={index} 
                  node={node} 
                  onMainNodeClick={this.props.onMainNodeClick}
                  onDownload={this.onDownload}
                  onDelete={this.props.onDeleteItem}
                />
              )
            })}
          </tbody>
        </table>
        {
          this.state.isProgressDialogShow && 
          <DownloadDialog progress={this.state.progress} onCancleDownload={this.onCancelDownload}/>
        }
      </div>
    )
  }
}

export default TreeDirView;