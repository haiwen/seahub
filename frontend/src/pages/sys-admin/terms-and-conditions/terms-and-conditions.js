import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, loginUrl } from '../../../utils/constants';
import AddOrUpdateTermDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-or-update-term-dialog';
import ModalPortal from '../../../components/modal-portal';
import toaster from '../../../components/toast';
import MainPanelTopbar from '../main-panel-topbar';
import Content from './content';

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
      // After adding the terms, you need to refresh the page.
      location.reload();
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
