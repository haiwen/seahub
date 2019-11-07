import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, loginUrl } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import { Button } from 'reactstrap';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import MainPanelTopbar from '../main-panel-topbar';
import AddOrUpdateTermDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-or-update-term-dialog';
import ModalPortal from '../../../components/modal-portal';
import OpMenu from './op-menu';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import toaster from '../../../components/toast';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No Terms and Conditions.')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="20%">{gettext('Name')}</th>
                <th width="10%">{gettext('Version')}</th>
                <th width="25%">{gettext('Text')}</th>
                <th width="20%">{gettext('Created')}</th>
                <th width="20%">{gettext('Activated')}</th>
                <th width="5%">{/* operation */}</th>
              </tr>
            </thead>
            {items &&
              <tbody>
                {items.map((item, index) => {
                  return (<Item
                    key={index}
                    item={item}
                    isItemFreezed={this.state.isItemFreezed}
                    onFreezedItem={this.onFreezedItem}
                    onUnfreezedItem={this.onUnfreezedItem}
                    deleteTerm={this.props.deleteTerm}
                    updateTerm={this.props.updateTerm}
                  />);
                })}
              </tbody>
            }
          </table>
        </Fragment>
      );
      return items.length ? table : emptyTip; 
    }
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      isUpdateDialogOpen: false,
      isDeleteDialogOpen: false,
    };
  }

  handleMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  }

  handleMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  }

  toggleUpdateDialog = (e) => {
    this.setState({isUpdateDialogOpen: !this.state.isUpdateDialogOpen});
  }

  toggleDeleteDialog = (e) => {
    this.setState({isDeleteDialogOpen: !this.state.isDeleteDialogOpen});
  }

  onMenuItemClick = (operation) => {
    switch(operation) {
      case 'Update':
        this.toggleUpdateDialog();
        break;
      case 'Delete':
        this.toggleDeleteDialog();
        break;
    }
  }

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  }

  deleteTerm = () => {
    this.props.deleteTerm(this.props.item.id);
    this.toggleDeleteDialog();
  }

  updateTerm = (name, versionNumber, text, isActive) => {
    this.props.updateTerm(this.props.item.id, name, versionNumber, text, isActive);
    this.toggleUpdateDialog();
  }

  render() {
    let { item } = this.props;
    let { isDeleteDialogOpen, isUpdateDialogOpen } = this.state;
    let term_text = '';
    if (item.text.length >= 20) {
      term_text = item.text.slice(0, 20) + '...';
    } else {
      term_text = item.text;
    }
    let itemName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', itemName);
    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td>{item.name}</td>
          <td>{item.version_number}</td>
          <td><a href='#'>{term_text}</a></td>
          <td>{moment(item.ctime).fromNow()}</td>
          <td>{item.activate_time ? moment(item.activate_time).fromNow() : '--'}</td>
          <td>
            {this.state.isOpIconShown &&
              <OpMenu
                item={item}
                onMenuItemClick={this.onMenuItemClick}
                onFreezedItem={this.props.onFreezedItem}
                onUnfreezedItem={this.onUnfreezedItem}
              />
            }
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <ModalPortal>
            <CommonOperationConfirmationDialog
              title={gettext('Delete T&C')}
              message={deleteDialogMsg}
              toggleDialog={this.toggleDeleteDialog}
              executeOperation={this.deleteTerm}
              confirmBtnText={gettext('Delete')}
            />
          </ModalPortal>
        }
        {isUpdateDialogOpen &&
          <ModalPortal>
            <AddOrUpdateTermDialog
              updateTerm={this.updateTerm}
              toggle={this.toggleUpdateDialog}
              isUpdate={true}
              oldTermObj={item}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

class TermsAndConditions extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      termList: [],
      isAddTermDialogOpen: false,
    };
  }

  toggleAddTermDialog = () => {
    this.setState({isAddTermDialogOpen: !this.state.isAddTermDialogOpen});
  }

  componentDidMount () {
    seafileAPI.sysAdminListTermsAndConditions().then((res) => {
      this.setState({
        termList: res.data.term_and_condition_list,
        loading: false,
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          });
        }
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  addTerm = (name, versionNumber, text, isActive) => {
    seafileAPI.sysAdminAddTermAndCondition(name, versionNumber, text, isActive).then(res => {
      let termList = this.state.termList;
      termList.push(res.data);
      this.setState({termList: termList});
      toaster.success(gettext('Successfully added'));
      this.toggleAddTermDialog();
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  updateTerm = (termID, name, versionNumber, text, isActive) => {
    seafileAPI.sysAdminUpdateTermAndCondition(termID, name, versionNumber, text, isActive).then(res => {
      let termList = this.state.termList.map(item => {
        if (item.id == termID) {
          return res.data;
        } else {
          return item;
        }
      });
      this.setState({termList: termList});
      toaster.success(gettext('Successfully update.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteTerm = (termID) => {
    seafileAPI.sysAdminDeleteTermAndCondition(termID).then(res => {
      let termList = this.state.termList.filter(item => item.id != termID);
      this.setState({termList: termList});
      toaster.success(gettext('Successfully deleted.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    let { termList, isAddTermDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleAddTermDialog}>{gettext('Add')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Terms and Conditions')}</h3>
            </div>
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={termList}
                deleteTerm={this.deleteTerm}
                updateTerm={this.updateTerm}
              />
            </div>
          </div>
        </div>
        {isAddTermDialogOpen &&
        <ModalPortal>
          <AddOrUpdateTermDialog
            isUpdate={false}
            addTerm={this.addTerm}
            toggle={this.toggleAddTermDialog}
          />
        </ModalPortal>
        }
      </Fragment>
    );
  }
}

export default TermsAndConditions;
