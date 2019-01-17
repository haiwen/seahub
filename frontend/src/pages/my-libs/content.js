import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, storages} from '../../utils/constants';
import Loading from '../../components/loading';
import TableBody from './table-body';
import ModalPortal from '../../components/modal-portal';
import LibHistorySetting from '../../components/dialog/lib-history-setting-dialog';
import TransferDialog from '../../components/dialog/transfer-dialog';
import DeleteRepoDialog from '../../components/dialog/delete-repo-dialog';

const propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  items: PropTypes.array.isRequired,
  onRenameRepo: PropTypes.func.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
  onTransferRepo: PropTypes.func.isRequired,
  onRepoDetails: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired
};

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      deleteItemPopupOpen: false,
      showTransfer: false,
      itemName: '',
      showHistorySetting: false,
      showDetails: false,
      libID: '',
      libSize: '',
      libUpdateTime: ''
    };
  }

  toggleDeleteItemPopup = () => {
    this.setState({
      deleteItemPopupOpen: !this.state.deleteItemPopupOpen
    });
  }

  showDeleteItemPopup = (data) => {
    this.toggleDeleteItemPopup();
    this.setState({
      deleteItemPopupData: data
    });
  }

  onTransfer = (itemName, itemID) => {
    this.setState({
      showTransfer: !this.state.showTransfer,
      itemName: itemName,
      libID: itemID 
    });
  } 

  onHistorySetting = (itemName, itemID) => {
    this.setState({
      showHistorySetting: !this.state.showHistorySetting,
      itemName: itemName,
      libID: itemID
    });
  } 

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  render() {
    const { loading, errorMsg, items, sortBy, sortOrder } = this.props;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <div className="empty-tip">
          <h2>{gettext('You have not created any libraries')}</h2>
          <p>{gettext('You can create a library to organize your files. For example, you can create one for each of your projects. Each library can be synchronized and shared separately.')}</p>
        </div>
      );

      // sort
      const sortByName = sortBy == 'name';
      const sortByTime = sortBy == 'time';
      const sortIcon = sortOrder == 'asc' ? <span className="fas fa-caret-up"></span> : <span className="fas fa-caret-down"></span>;

      // TODO: test 'storage backend'
      const showStorageBackend = storages.length > 0; // only for desktop
      const desktopThead = (
        <thead>
          <tr>
            <th width="4%"><span className="sr-only">{gettext('Library Type')}</span></th>
            <th width="42%"><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a></th>
            <th width="14%"><span className="sr-only">{gettext('Actions')}</span></th>

            <th width={showStorageBackend ? '15%' : '20%'}>{gettext('Size')}</th>
            {showStorageBackend ? <th width="10%">{gettext('Storage backend')}</th> : null}
            <th width={showStorageBackend ? '15%' : '20%'}><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {sortByTime && sortIcon}</a></th>
          </tr>
        </thead>
      );

      const mobileThead = (
        <thead>
          <tr>
            <th width="18%"><span className="sr-only">{gettext('Library Type')}</span></th>
            <th width="76%">
              {gettext("Sort:")}
              <a className="table-sort-op" href="#" onClick={this.sortByName}>{gettext("name")} {sortByName && sortIcon}</a>
              <a className="table-sort-op" href="#" onClick={this.sortByTime}>{gettext("last update")} {sortByTime && sortIcon}</a>
            </th>
            <th width="6%"><span className="sr-only">{gettext('Actions')}</span></th>
          </tr>
        </thead>
      );

      const table = (
        <table>
          {window.innerWidth >= 768 ? desktopThead : mobileThead}
          <TableBody 
            items={items} 
            onRenameRepo={this.props.onRenameRepo}
            onDeleteRepo={this.props.onDeleteRepo}
            onRepoDetails={this.props.onRepoDetails}
            onItemClick={this.props.onItemClick}
            onTransfer={this.onTransfer}
            showDeleteItemPopup={this.showDeleteItemPopup}
            onHistorySetting={this.onHistorySetting}
          />
        </table>
      );

      const nonEmpty = (
        <Fragment>
          {table}
          {this.state.deleteItemPopupOpen && (
            <ModalPortal>
              <DeleteRepoDialog 
                toggle={this.toggleDeleteItemPopup} 
                data={this.state.deleteItemPopupData} 
              />
            </ModalPortal>
          )}
          {this.state.showTransfer &&
            <ModalPortal>
              <TransferDialog 
                toggleDialog={this.onTransfer} 
                itemName={this.state.itemName}
                repoID={this.state.libID}
                submit={this.props.onTransferRepo}
              />
            </ModalPortal>
          }
          {this.state.showHistorySetting &&
            <ModalPortal>
              <LibHistorySetting 
                toggleDialog={this.onHistorySetting} 
                itemName={this.state.itemName}
                repoID={this.state.libID}
              />
            </ModalPortal>
          }
        </Fragment>
      );

      return items.length ? nonEmpty : emptyTip; 
    }
  }
}

Content.propTypes = propTypes;

export default Content;
