import React, { Fragment } from 'react';
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
  path: PropTypes.string.isRequired,
  direntList: PropTypes.array.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onAllItemSelected: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onItemDetails: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  isRepoOwner: PropTypes.bool,
  currentRepo: PropTypes.object,
  isAllDirentSelected: PropTypes.bool.isRequired,
};

class DirentListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
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

  render() {
    const { direntList } = this.props;

    if (this.props.isDirentListLoading) {
      return (<Loading />);
    }

    return (
      <Fragment>
        <table>
          <thead>
            <tr>
              <th width="3%" className="select">
                <input type="checkbox" className="vam" onChange={this.props.onAllItemSelected} checked={this.props.isAllDirentSelected}/>
              </th>
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
                    path={this.props.path}
                    currentRepo={this.props.currentRepo}
                    isRepoOwner={this.props.isRepoOwner}
                    onItemClick={this.props.onItemClick}
                    onRenameMenuItemClick={this.onRenameMenuItemClick}
                    onItemSelected={this.props.onItemSelected}
                    onItemDelete={this.props.onItemDelete}
                    onItemRename={this.props.onItemRename}
                    isItemFreezed={this.state.isItemFreezed}
                    onFreezedItem={this.onFreezedItem}
                    onUnfreezedItem={this.onUnfreezedItem}
                    onItemDownload={this.props.onItemDownload}
                    onDirentItemMove={this.onDirentItemMove}
                    onDirentItemCopy={this.onDirentItemCopy}
                    onItemDetails={this.onItemDetails}
                    updateDirent={this.props.updateDirent}
                  />
                );
              })
            }
          </tbody>
        </table>
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
      </Fragment>
    );
  }
}

DirentListView.propTypes = propTypes;

export default DirentListView;
