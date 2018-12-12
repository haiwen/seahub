import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, storages} from '../../utils/constants';
import TransferDialog from '../../components/dialog/transfer-dialog';
import LibHistorySetting from '../../components/dialog/lib-history-setting-dialog';
import Loading from '../../components/loading';
import ModalPortal from '../../components/modal-portal';
import DeleteRepoDialog from '../../components/dialog/delete-repo-dialog';
import TableBody from './table-body';

const propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  onRenameRepo: PropTypes.func.isRequired,
  onDeleteRepo: PropTypes.func.isRequired,
  onTransferRepo: PropTypes.func.isRequired,
  onRepoDetails: PropTypes.func.isRequired,
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

  render() {
    const { loading, errorMsg, items } = this.props;

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

      // TODO: test 'storage backend'
      const showStorageBackend = storages.length > 0; // only for desktop
      const desktopThead = (
        <thead>
          <tr>
            <th width="4%"><span className="sr-only">{gettext("Library Type")}</span></th>
            <th width="42%">{gettext("Name")}<a className="table-sort-op by-name" href="#">{/*TODO: sort*/}<span className="sort-icon icon-caret-down hide"></span></a></th>
            <th width="14%"><span className="sr-only">{gettext("Actions")}</span></th>

            <th width={showStorageBackend ? '15%' : '20%'}>{gettext("Size")}</th>
            {showStorageBackend ? <th width="10%">{gettext('Storage backend')}</th> : null}
            <th width={showStorageBackend ? '15%' : '20%'}>{gettext("Last Update")}<a className="table-sort-op by-time" href="#">{/*TODO: sort*/}<span className="sort-icon icon-caret-up"></span></a></th>
          </tr>
        </thead>
      );

      const mobileThead = (
        <thead>
          <tr>
            <th width="18%"><span className="sr-only">{gettext("Library Type")}</span></th>
            <th width="76%">
              {gettext("Sort:")} {/* TODO: sort */}
              {gettext("name")}<a className="table-sort-op mobile-table-sort-op by-name" href="#"> <span className="sort-icon icon-caret-down hide"></span></a>
              {gettext("last update")}<a className="table-sort-op mobile-table-sort-op by-time" href="#"> <span className="sort-icon icon-caret-up"></span></a>
            </th>
            <th width="6%"><span className="sr-only">{gettext("Actions")}</span></th>
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
            onTransfer={this.onTransfer}
            showDeleteItemPopup={this.showDeleteItemPopup}
            onHistorySetting={this.onHistorySetting}
          />
        </table>
      );

      const nonEmpty = (
        <Fragment>
          {table}
          <DeleteRepoDialog 
            isOpen={this.state.deleteItemPopupOpen} 
            toggle={this.toggleDeleteItemPopup} 
            data={this.state.deleteItemPopupData} 
          />
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