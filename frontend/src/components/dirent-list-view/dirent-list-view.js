import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import Loading from '../loading';
import DirentListItem from './dirent-list-item';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  isRepoOwner: PropTypes.bool,
  currentRepoInfo: PropTypes.object,
  isAllItemSelected: PropTypes.bool.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
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
};

class DirentListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
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

  render() {
    const { direntList } = this.props;

    if (this.props.isDirentListLoading) {
      return (<Loading />);
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
                  currentRepoInfo={this.props.currentRepoInfo}
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
