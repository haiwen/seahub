import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import { Button } from 'reactstrap';
import { mediaUrl } from '../../utils/constants';
import SeatableAccountItem from './seatable-account-setting-item';

class SeatableAccountSettingList extends Component {

  static propTypes = {
    accounts: PropTypes.array,
    changeStatus: PropTypes.func,
    editSeatableSettingAccount: PropTypes.func,
    seatableSettings: PropTypes.array,
    deleteStableAccountSetting: PropTypes.func,
    t: PropTypes.func,
  };

  renderContent = () => {
    const { t, seatableSettings } = this.props;
    if (!Array.isArray(seatableSettings) || seatableSettings.length === 0) {
      return (
        <div className="no-accounts d-flex flex-column align-items-center justify-content-center">
          <img src={`${mediaUrl}img/no-items-tip.png`} alt={t('No SeaTable libraries')} />
          <p>{t('No Seafile libraries')}</p>
        </div>
      );
    }
    return (
      <>
        <table className="accounts-list-header">
          <thead>
            <tr>
              <th width='20%'>{t('Base name')}</th>
              <th width='60%'>{t('SeaTable server URL')}</th>
              <th width='20%'>{t('Operation')}</th>
            </tr>
          </thead>
        </table>
        <div className="accounts-list-body">
          <table>
            <tbody>
              {seatableSettings.map((setting, index) => {
                return (
                  <SeatableAccountItem
                    setting={setting}
                    editSeatableSettingAccount={this.props.editSeatableSettingAccount}
                    deleteStableAccountSetting={this.props.deleteStableAccountSetting}
                    t={t}
                    index={index}
                    key={setting.base_api_token}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  render() {
    const { t, seatableSettings } = this.props;
    return (
      <div className="accounts-manage">
        <div className="accounts-manage-header d-flex align-items-center justify-content-between">
          <span>{t('SeaTable')}</span>
          {seatableSettings && seatableSettings.length === 0 &&
            <div>
              <Button color="primary" size="sm" outline={true} onClick={this.props.changeStatus}>{t('Add SeaTable integration')}</Button>
            </div>
          }
        </div>
        <div className="accounts-list mt-2">
          {this.renderContent()}
        </div>
      </div>
    );
  }
}

export default withTranslation('dtable')(SeatableAccountSettingList);
