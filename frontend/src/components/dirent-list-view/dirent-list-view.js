import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import Loading from '../loading';
import DirentListItem from './dirent-list-item';
import ModalPortal from '../modal-portal';
import CreateFile from '../../components/dialog/create-file-dialog';

import '../../css/tip-for-new-md.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  isRepoOwner: PropTypes.bool,
  currentRepo: PropTypes.object,
  isAllItemSelected: PropTypes.bool.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onAllItemSelected: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onItemDetails: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
};

class DirentListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
      isCreateFileDialogShow: false,
      fileType: ''
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  onItemRenameToggle = () => {
    this.onFreezedItem();
  }

  onItemDetails = (dirent) => {
    this.props.onItemDetails(dirent);
  }

  onCreateFileToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: ''
    });
  }

  onCreateMarkdownToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: '.md'
    });
  }

  onAddFile = (filePath, isDraft) => {
    this.setState({isCreateFileDialogShow: false});
    this.props.onAddFile(filePath, isDraft);
  }

  render() {
    const { direntList } = this.props;

    if (this.props.isDirentListLoading) {
      return (<Loading />);
    }

    if (this.props.path == '/' && !direntList.length) {
      return (
        <Fragment>
          <div className="tip-for-new-md d-flex">
            <button className="big-new-md-button" onClick={this.onCreateMarkdownToggle}><span className="sf2-icon-plus add-md-icon"></span><br />{gettext('Markdown Document')}</button>
            <p>{gettext('You can create online document using Markdown format easily. When creating a document, you can mark it as draft. After finishing the draft, you can ask others to review it. They can view the document history in the review page and leave comments on the document.')}</p>
          </div>
          {this.state.isCreateFileDialogShow && (
            <ModalPortal>
              <CreateFile
                parentPath={this.props.path}
                fileType={this.state.fileType}
                onAddFile={this.onAddFile}
                addFileCancel={this.onCreateFileToggle}
              />
            </ModalPortal>
          )}
        </Fragment>
      );
    }

    return (
      <table>
        <thead>
          <tr>
            <th width="3%" className="select">
              <input type="checkbox" className="vam" onChange={this.props.onAllItemSelected} checked={this.props.isAllItemSelected}/>
            </th>
            <th width="3%">{/*icon */}</th>
            <th width="5%">{/*star */}</th>
            <th width="39%">{gettext('Name')}</th>
            <th width="6%">{/*tag */}</th>
            <th width="20%">{/*operation */}</th>
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
                  repoID={this.props.repoID}
                  currentRepo={this.props.currentRepo}
                  isRepoOwner={this.props.isRepoOwner}
                  onItemClick={this.props.onItemClick}
                  onItemRenameToggle={this.onItemRenameToggle}
                  onItemSelected={this.props.onItemSelected}
                  onItemDelete={this.props.onItemDelete}
                  onItemRename={this.props.onItemRename}
                  onItemMove={this.props.onItemMove}
                  onItemCopy={this.props.onItemCopy}
                  updateDirent={this.props.updateDirent}
                  isItemFreezed={this.state.isItemFreezed}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                  onItemDetails={this.onItemDetails}
                />
              );
            })
          }
        </tbody>
      </table>
    );
  }
}

DirentListView.propTypes = propTypes;

export default DirentListView;
