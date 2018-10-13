import React from 'react';
import PropTypes from 'prop-types';
import { gettext, repoID } from '../../utils/constants';
import URLDecorator from '../../utils/url-decorator';
import editorUtilities from '../../utils/editor-utilties';
import { seafileAPI } from '../../utils/seafile-api';
import DirentListItem from './dirent-list-item';
import ZipDownloadDialog from '../dialog/zip-download-dialog';

const propTypes = {
  filePath: PropTypes.string.isRequired,
  direntList: PropTypes.array.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  updateViewList: PropTypes.func.isRequired,
};

class DirentListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
      isProgressDialogShow: false,
      progress: '0%',
    };
  }

  onItemMenuShow = () => {
    this.setState({isItemFreezed: true});
  }
  
  onItemMenuHide = () => {
    this.setState({isItemFreezed: false});
  }

  onItemClick = (dirent) => {
    let direntPath = this.getDirentPath(dirent);
    this.props.onItemClick(direntPath);
  }

  onItemDelete = (dirent) => {
    let direntPath = this.getDirentPath(dirent);
    this.props.onItemDelete(direntPath);
  }

  onItemStarred = (dirent) => {
    let filePath = this.getDirentPath(dirent);
    if (dirent.starred) {
      seafileAPI.unStarFile(repoID, filePath).then(() => {
        this.props.updateViewList(this.props.filePath);
      });
    } else {
      seafileAPI.starFile(repoID, filePath).then(() => {
        this.props.updateViewList(this.props.filePath);
      });
    }
  }

  onItemDownload = (dirent) => {
    if (dirent.type === 'dir') {
      this.setState({isProgressDialogShow: true, progress: '0%'});
      editorUtilities.zipDownload(this.props.filePath, dirent.name).then(res => {
        this.zip_token = res.data['zip_token'];
        this.addDownloadAnimation();
        this.interval = setInterval(this.addDownloadAnimation, 1000);
      });
    } else {
      let path = this.getDirentPath(dirent);
      let url = URLDecorator.getUrl({type: 'download_file_url', repoID: repoID, filePath: path});
      location.href = url;
    }
  }

  addDownloadAnimation = () => {
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
    });
  }

  getDirentPath = (dirent) => {
    let path = this.props.filePath;
    return path === '/' ? path + dirent.name : path + '/' + dirent.name;
  }

  render() {
    const { direntList } = this.props;
    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th width="3%" className="select"><input type="checkbox" className="vam" /></th>
              <th width="3%"></th>
              <th width="5%"></th>
              <th width="45%">{gettext('Name')}</th>
              <th width="20%"></th>
              <th width="11%">{gettext('Size')}</th>
              <th width="13%">{gettext('Last Update')}</th>
            </tr>
          </thead>
          <tbody>
            {
              direntList.length !== 0 && direntList.map((dirent, index) => {
                return (
                  <DirentListItem
                    key={index}
                    dirent={dirent}
                    isItemFreezed={this.state.isItemFreezed}
                    onItemMenuShow={this.onItemMenuShow}
                    onItemMenuHide={this.onItemMenuHide}
                    onItemDelete={this.onItemDelete}
                    onItemStarred={this.onItemStarred}
                    onItemDownload={this.onItemDownload}
                    onItemClick={this.onItemClick}
                  />
                );
              })
            }
          </tbody>
        </table>
        {
          this.state.isProgressDialogShow && 
          <ZipDownloadDialog progress={this.state.progress} onCancelDownload={this.onCancelDownload}/>
        }
      </div>
    );
  }
}

DirentListView.propTypes = propTypes;

export default DirentListView;
