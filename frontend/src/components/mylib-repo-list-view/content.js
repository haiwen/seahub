import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { gettext, storages} from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import TransferDialog from '../dialog/transfer-dialog';
import LibHistorySetting from '../dialog/lib-history-setting-dialog';
import LibDetail from '../dirent-detail/lib-details';
import Loading from '../loading';
import ModalPortal from '../modal-portal';
import DeleteItemPopup from './popups/delete-item';
import TableBody from './table-body';

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

    this.toggleDeleteItemPopup = this.toggleDeleteItemPopup.bind(this);
    this.showDeleteItemPopup = this.showDeleteItemPopup.bind(this);
    this.onTransfer = this.onTransfer.bind(this);
    this.onHistorySetting = this.onHistorySetting.bind(this);
    this.onFileTagChanged = this.onFileTagChanged.bind(this);
    this.onDetails = this.onDetails.bind(this);
    this.closeDetails = this.closeDetails.bind(this);

    this.operations = {
      showDeleteItemPopup: this.showDeleteItemPopup,
      onTransfer: this.onTransfer,
      onHistorySetting: this.onHistorySetting,
      onDetails: this.onDetails,
      onRenameRepo: this.props.renameRepo,
    };
  }

  toggleDeleteItemPopup() {
    this.setState({
      deleteItemPopupOpen: !this.state.deleteItemPopupOpen
    });
  }

  showDeleteItemPopup(data) {
    this.toggleDeleteItemPopup();
    this.setState({
      deleteItemPopupData: data
    });
  }

  onTransfer(itemName, itemID) {
    this.setState({
      showTransfer: !this.state.showTransfer,
      itemName: itemName,
      libID: itemID 
    });
  } 

  onHistorySetting(itemName, itemID) {
    this.setState({
      showHistorySetting: !this.state.showHistorySetting,
      itemName: itemName,
      libID: itemID
    });
  } 

  onDetails(data) {
    const libSize = Utils.formatSize({bytes: data.size});
    const libID = data.repo_id;
    const libUpdateTime = moment(data.last_modified).fromNow(); 

    this.setState({
      showDetails: !this.state.showDetails,
      libID: libID,
      libSize: libSize,
      libUpdateTime: libUpdateTime
    });
  }

  closeDetails() {
    this.setState({
      showDetails: !this.state.showDetails
    })
  }

   onFileTagChanged() {
    seafileAPI.listFileTags(this.state.detailsRepoID, '/').then(res => {
      let fileTags = res.data.file_tags.map(item => {
        console.log(item);
      });
    });
   }


  render() {
    const {loading, errorMsg, items} = this.props.data;

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
          <TableBody items={items} operations={this.operations} />
        </table>
      );

      const nonEmpty = (
        <React.Fragment>
          {table}
          <DeleteItemPopup isOpen={this.state.deleteItemPopupOpen} 
            toggle={this.toggleDeleteItemPopup} data={this.state.deleteItemPopupData} />
          {this.state.showTransfer &&
            <ModalPortal>
              <TransferDialog toggleDialog={this.onTransfer} 
                              itemName={this.state.itemName}
                              repoID={this.state.libID}
                              submit={this.props.toggleTransferSubmit}
                              />
            </ModalPortal>
          }
          {this.state.showHistorySetting &&
            <ModalPortal>
              <LibHistorySetting toggleDialog={this.onHistorySetting} 
                                 itemName={this.state.itemName}
                                 repoID={this.state.libID}
                                 />
            </ModalPortal>
          }
          {this.state.showDetails && (
            <div className="cur-view-detail">
              <LibDetail libID={this.state.libID}
                         libSize={this.state.libSize}
                         libUpdateTime={this.state.libUpdateTime}
                         closeDetails={this.closeDetails}
                         />
            </div>
          )}
        </React.Fragment>
      );

      return items.length ? nonEmpty : emptyTip; 
    }
  }
}

export default Content;