import React from 'react';
import { gettext, siteRoot } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import ConfirmDeleteAccount from '../dialog/confirm-delete-account';

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
  }

  toggleDialog = () => {
    this.setState({
      isConfirmDialogOpen: !this.state.isConfirmDialogOpen
    });
  }

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
