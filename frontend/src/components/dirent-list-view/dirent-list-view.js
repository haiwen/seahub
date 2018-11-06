import React from 'react';
import PropTypes from 'prop-types';
import { gettext, repoID } from '../../utils/constants';
import URLDecorator from '../../utils/url-decorator';
import editorUtilities from '../../utils/editor-utilties';
import Loading from '../loading';
import DirentListItem from './dirent-list-item';
import ZipDownloadDialog from '../dialog/zip-download-dialog';
import MoveDirentDialog from '../dialog/move-dirent-dialog';
import CopyDirentDialog from '../dialog/copy-dirent-dialog';

const propTypes = {
  filePath: PropTypes.string.isRequired,
  direntList: PropTypes.array.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onItemDetails: PropTypes.func.isRequired,
  updateViewList: PropTypes.func.isRequired,
  updateViewListParam: PropTypes.func.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  isRepoOwner: PropTypes.bool,
  currentRepo: PropTypes.object,
};

class DirentListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      progress: 0,
      isItemFreezed: false,
      isProgressDialogShow: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      currentDirent: false,
      direntPath: '',
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }
  
  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  onRenameMenuItemClick = () => {
    this.onFreezedItem();
  }

  onDirentItemMove = (dirent, direntPath) => {
    this.setState({
      isMoveDialogShow: true,
      currentDirent: dirent,
      direntPath: direntPath
    });
  }

  onDirentItemCopy = (dirent, direntPath) => {
    this.setState({
      isCopyDialogShow: true,
      currentDirent: dirent,
      direntPath: direntPath
    });
  }

  onItemMove = (repo, direntPath, moveToDirentPath) => {
    this.props.onItemMove(repo, direntPath, moveToDirentPath);
  }
  
  onCancelMove = () => {
    this.setState({isMoveDialogShow: false});
  }
  
  onItemCopy = (repo, direntPath, copyToDirentPath) => {
    this.props.onItemCopy(repo, direntPath, copyToDirentPath);
  }
  
  onCancelCopy = () => {
    this.setState({isCopyDialogShow: false});
  }

  onItemDetails = (dirent, direntPath) => {
    this.props.onItemDetails(dirent, direntPath);
  }

  onItemDownload = (dirent, direntPath) => {
    if (dirent.type === 'dir') {
      this.setState({isProgressDialogShow: true, progress: 0});
      editorUtilities.zipDownload(this.props.filePath, dirent.name).then(res => {
        this.zip_token = res.data['zip_token'];
        this.addDownloadAnimation();
        this.interval = setInterval(this.addDownloadAnimation, 1000);
      });
    } else {
      let url = URLDecorator.getUrl({type: 'download_file_url', repoID: repoID, filePath: direntPath});
      location.href = url;
    }
  }

  addDownloadAnimation = () => {
    let _this = this;
    let token = this.zip_token;
    editorUtilities.queryZipProgress(token).then(res => {
      let data = res.data;
      let progress = data.total === 0 ? 100 : (data.zipped / data.total * 100).toFixed(0);
      this.setState({progress: parseInt(progress)});

      if (data['total'] === data['zipped']) {
        this.setState({
          progress: 100
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

  render() {
    const { direntList } = this.props;

    if (this.props.isDirentListLoading) {
      return (<Loading />);
    }

    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th width="3%" className="select"><input type="checkbox" className="vam" /></th>
              <th width="3%"></th>
              <th width="5%"></th>
              <th width="35%">{gettext('Name')}</th>
              <th width="10%"></th>
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
                    filePath={this.props.filePath}
                    currentRepo={this.props.currentRepo}
                    isRepoOwner={this.props.isRepoOwner}
                    onItemClick={this.props.onItemClick}
                    onRenameMenuItemClick={this.onRenameMenuItemClick}
                    onItemDelete={this.props.onItemDelete}
                    onItemRename={this.props.onItemRename}
                    updateViewList={this.props.updateViewList}
                    isItemFreezed={this.state.isItemFreezed}
                    onFreezedItem={this.onFreezedItem}
                    onUnfreezedItem={this.onUnfreezedItem}
                    onItemDownload={this.onItemDownload}
                    onDirentItemMove={this.onDirentItemMove}
                    onDirentItemCopy={this.onDirentItemCopy}
                    onItemDetails={this.onItemDetails}
                    updateViewListParam={this.props.updateViewListParam}
                  />
                );
              })
            }
          </tbody>
        </table>
        {this.state.isProgressDialogShow && 
          <ZipDownloadDialog progress={this.state.progress} onCancelDownload={this.onCancelDownload}
          />
        }
        {this.state.isMoveDialogShow &&
          <MoveDirentDialog 
            dirent={this.state.currentDirent} 
            direntPath={this.state.direntPath} 
            onItemMove={this.props.onItemMove}
            onCancelMove={this.onCancelMove}
          />
        }
        {this.state.isCopyDialogShow &&
          <CopyDirentDialog 
            dirent={this.state.currentDirent} 
            direntPath={this.state.direntPath} 
            onItemCopy={this.props.onItemCopy}
            onCancelCopy={this.onCancelCopy} 
          />
        }
      </div>
    );
  }
}

DirentListView.propTypes = propTypes;

export default DirentListView;
