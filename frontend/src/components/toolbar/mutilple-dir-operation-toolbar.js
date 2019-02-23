import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button , ButtonGroup } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import ZipDownloadDialog from '../dialog/zip-download-dialog';
import MoveDirentDialog from '../dialog/move-dirent-dialog';
import CopyDirentDialog from '../dialog/copy-dirent-dialog';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
};

class MutipleDirOperationToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      progress: 0,
      isProgressDialogShow: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isMutipleOperation: true,
    };
    this.zipToken = null;
  }

  onMoveToggle = () => {
    this.setState({isMoveDialogShow: !this.state.isMoveDialogShow});
  }

  onCopyToggle = () => {
    this.setState({isCopyDialogShow: !this.state.isCopyDialogShow});
  }

  onItemsDelete = () => {
    this.props.onItemsDelete();
  }

  onItemsDownload = () => {
    let { path, repoID, selectedDirentList } = this.props;
    if (selectedDirentList.length) {
      if (selectedDirentList.length === 1 && !selectedDirentList[0].isDir()) {
        let direntPath = Utils.joinPath(path, selectedDirentList[0].name);
        let url = URLDecorator.getUrl({type: 'download_file_url', repoID: repoID, filePath: direntPath});
        location.href= url;
        return;
      }
      let selectedDirentNames = selectedDirentList.map(dirent => {
        return dirent.name;
      });
      this.setState({isProgressDialogShow: true, progress: 0});
      seafileAPI.zipDownload(repoID, path, selectedDirentNames).then(res => {
        this.zipToken = res.data['zip_token'];
        this.addDownloadAnimation();
        this.interval = setInterval(this.addDownloadAnimation, 1000);
      });
    }
  }

  addDownloadAnimation = () => {
    let _this = this;
    let token = this.zipToken;
    seafileAPI.queryZipProgress(token).then(res => {
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
    seafileAPI.cancelZipTask(this.zipToken).then(() => {
      this.setState({isProgressDialogShow: false});
    });
  }

  render() {
    return (
      <Fragment>
        <ButtonGroup className="flex-row group-operations">
          <Button className="secondary group-op-item action-icon sf2-icon-move" title={gettext('Move')} onClick={this.onMoveToggle}></Button>
          <Button className="secondary group-op-item action-icon sf2-icon-copy" title={gettext('Copy')} onClick={this.onCopyToggle}></Button>
          <Button className="secondary group-op-item action-icon sf2-icon-delete" title={gettext('Delete')} onClick={this.onItemsDelete}></Button>
          <Button className="secondary group-op-item action-icon sf2-icon-download" title={gettext('Download')} onClick={this.onItemsDownload}></Button>
        </ButtonGroup>
        {this.state.isMoveDialogShow && 
          <MoveDirentDialog 
            path={this.props.path}
            repoID={this.props.repoID}
            isMutipleOperation={this.state.isMutipleOperation}
            selectedDirentList={this.props.selectedDirentList}
            onItemsMove={this.props.onItemsMove}
            onCancelMove={this.onMoveToggle}
          />
        }
        {this.state.isCopyDialogShow &&
          <CopyDirentDialog
            path={this.props.path}
            repoID={this.props.repoID}
            selectedDirentList={this.props.selectedDirentList}
            isMutipleOperation={this.state.isMutipleOperation}
            onItemsCopy={this.props.onItemsCopy}
            onCancelCopy={this.onCopyToggle}
          />
        }
        {this.state.isProgressDialogShow &&
          <ZipDownloadDialog progress={this.state.progress} onCancelDownload={this.onCancelDownload} />
        }
      </Fragment>
    );
  }
}

MutipleDirOperationToolbar.propTypes = propTypes;

export default MutipleDirOperationToolbar;
