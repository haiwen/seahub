import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { gettext, mediaUrl } from '../../utils/constants';
import SeatableAccountItem from './seatable-account-setting-item';

class SeatableAccountSettingList extends Component {

  static propTypes = {
    accounts: PropTypes.array,
    changeStatus: PropTypes.func,
    editSeatableSettingAccount: PropTypes.func,
    seatableSettings: PropTypes.array,
    deleteStableAccountSetting: PropTypes.func,
  };

  renderContent = () => {
    const { seatableSettings } = this.props;
    if (!Array.isArray(seatableSettings) || seatableSettings.length === 0) {
      return (
        <div className="no-accounts d-flex flex-column align-items-center justify-content-center">
          <img src={`${mediaUrl}img/no-items-tip.png`} alt={gettext('No SeaTable bases')} />
          <p>{gettext('No SeaTable bases')}</p>
        </div>
      );
    }
    return (
      <>
        <table className="accounts-list-header">
          <thead>
            <tr>
              <th width='30%'>{gettext('SeaTable base name')}</th>
              <th width='55%'>{gettext('SeaTable server URL')}</th>
              <th width='15%'> </th>
            </tr>
          </thead>
        </table>
        <div className="accounts-list-body">
          <table>
            <tbody>
              {seatableSettings.map((setting, index) => {
                return (
                  <SeatableAccountItem
                    key={setting.base_api_token}
                    index={index}
                    setting={setting}
                    editSeatableSettingAccount={this.props.editSeatableSettingAccount}
                    deleteStableAccountSetting={this.props.deleteStableAccountSetting}
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
    return (
      <div className="accounts-manage">
        <div className="accounts-manage-header d-flex align-items-center justify-content-between">
          <span>{'SeaTable'}</span>
          <Button color="primary" size="sm" outline={true} onClick={this.props.changeStatus}>{gettext('Add')}</Button>
        </div>
        <div className="accounts-list mt-2">
          {this.renderContent()}
        </div>
      </div>
    );
  }
}

export default SeatableAccountSettingList;
