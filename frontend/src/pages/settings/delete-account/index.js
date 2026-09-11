import React from 'react';
import ConfirmDeleteAccount from '@/components/dialog/confirm-delete-account';
import ModalPortal from '@/components/modal-portal';
import { gettext, siteRoot } from '../../../utils/constants';

const {
  csrfToken
} = window.app.pageOptions;

class DeleteAccount extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isConfirmDialogOpen: false
    };
  }

  confirmDelete = (e) => {
    e.preventDefault();
    this.setState({
      isConfirmDialogOpen: true
    });
  };

  toggleDialog = () => {
    this.setState({
      isConfirmDialogOpen: !this.state.isConfirmDialogOpen
    });
  };

  render() {
    return (
      <React.Fragment>
        <div className="setting-item" id="del-account">
          <h3 className="setting-item-heading">{gettext('Delete Account')}</h3>
          <p className="mb-2">{gettext('This operation will not be reverted. Please think twice!')}</p>
          <button type="button" className="btn btn-outline-primary" onClick={this.confirmDelete}>{gettext('Delete')}</button>
        </div>
        {this.state.isConfirmDialogOpen && (
          <ModalPortal>
            <ConfirmDeleteAccount
              formActionURL={`${siteRoot}profile/delete/`}
              csrfToken={csrfToken}
              toggle={this.toggleDialog}
            />
          </ModalPortal>
        )}
      </React.Fragment>
    );
  }
}

export default DeleteAccount;
