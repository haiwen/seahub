import React, {Component, Fragment} from 'react';
import Account from '../../components/common/account';
import {gettext} from '../../utils/constants';
import {Utils} from '../../utils/utils';

class AbuseReports extends Component {

  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const isDesktop = Utils.isDesktop();
    return (
      <Fragment>
        <div className="main-panel-north">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu"></span>
          </div>
          <div className="common-toolbar">
            <Account isAdminPanel={true}/>
          </div>
        </div>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Abuse Reports')}</h3>
            </div>
            <div className="cur-view-content">
              <table className={`table-hover${isDesktop ? '' : ' table-thead-hidden'}`}>
                <thead>
                {isDesktop ?
                  <tr>
                    <th width="5%"></th>
                    <th width="15%">{gettext("Library")}</th>
                    <th width="20%">{gettext("File")}</th>
                    <th width="10%">{gettext("Reporter")}</th>
                    <th width="15%">{gettext("Abuse Type")}</th>
                    <th width="15%">{gettext("Description")}</th>
                    <th width="10%">{gettext("Time")}</th>
                    <th width="5%">{gettext("Handled")}</th>
                  </tr>
                  :
                  <tr>
                    <th width="92%"></th>
                    <th width="8%"></th>
                  </tr>
                }
                </thead>
                <tbody>

                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default AbuseReports;