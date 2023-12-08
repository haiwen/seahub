import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import DeleteSeatablesDialog from './delete-seatables-dialog';

class SeatableAccountItem extends Component {

  constructor (props) {
    super(props);
    this.state = {
      isShowDialog: false,
    };
  }

  static propTypes = {
    t: PropTypes.func,
    editSeatableSettingAccount: PropTypes.func,
    deleteStableAccountSetting: PropTypes.func,
    setting: PropTypes.object,
    index: PropTypes.number,
  };

  openDialog = () => {
    this.setState({isShowDialog: true});
  };

  closeDialog = () => {
    this.setState({isShowDialog: false});
  };

  onDeleteSeatables = () => {
    const { setting } = this.props;
    this.props.deleteStableAccountSetting(setting, 'seatable_account_manage');
    this.closeDialog();
  };

  render() {
    const { isShowDialog } = this.state;
    const { setting, t, index } = this.props;
    const { base_api_token, base_name, seatable_server_url } = setting;
    return (
      <tr key={`account-${base_api_token}`}>
        <td width='30%' className="text-truncate" title={base_name} aria-label={base_name}>{base_name}</td>
        <td id={`abc-${index}`} width='55%' className="text-truncate" title={seatable_server_url} aria-label={seatable_server_url}>
          {seatable_server_url}
        </td>
        <td width='15%'>
          <span
            className="account-operation-btn"
            onClick={this.props.editSeatableSettingAccount.bind(this, base_api_token)}
            title={t('Edit')}
            aria-label={t('Edit')}
          >
            <i className="sf2-icon-edit" style={{color: '#999'}}></i>
          </span>
          <span
            className="account-operation-btn"
            onClick={this.openDialog}
            title={t('Delete')}
            aria-label={t('Delete')}
          >
            <i className="sf2-icon-delete" style={{color: '#999'}}></i>
          </span>
        </td>
        {isShowDialog &&
          <DeleteSeatablesDialog
            t={t}
            accountName={base_name}
            onDeleteSeatables={this.onDeleteSeatables}
            closeDialog={this.closeDialog}
          />
        }
      </tr>
    );
  }
}

export default withTranslation('dtable')(SeatableAccountItem);
