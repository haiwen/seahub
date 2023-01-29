import React, { Component, Fragment } from 'react';
import Account from '../../components/common/account';
import { gettext, siteRoot, mediaUrl } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../../components/toast';
import moment from 'moment';
import MainPanelTopbar from './main-panel-topbar';

class AbuseReports extends Component {

  constructor(props) {
    super(props);
    this.state = {
      abuseReportList: [],
    };
  }

  listAbuseReports = () => {
    seafileAPI.sysAdminListAbuseReports().then((res) => {
      this.setState({
        abuseReportList: res.data.abuse_report_list,
      });
    }).catch((error) => {
      this.handleError(error);
    });
  };

  updateAbuseReport = (handled, abuseReportId) => {
    seafileAPI.sysAdminUpdateAbuseReport(handled, abuseReportId).then((res) => {
      const abuseReportList = this.state.abuseReportList.map((item, index) => {
        if (item.id === abuseReportId) {
          item.handled = res.data.handled;
        }
        return item;
      });
      this.setState({
        abuseReportList: abuseReportList,
      });
    }).catch((error) => {
      this.handleError(error);
    });
  };

  handleError = (e) => {
    if (e.response) {
      toaster.danger(e.response.data.error_msg || e.response.data.detail || gettext('Error'), {duration: 3});
    } else {
      toaster.danger(gettext('Please check the network.'), {duration: 3});
    }
  };

  componentDidMount() {
    this.listAbuseReports();
  }

  render() {
    const isDesktop = Utils.isDesktop();
    const AbuseReportList = this.state.abuseReportList.map((item, index) => {
      const handled = (!item.handled).toString();
      const abuseReportId = item.id;
      const fileUrl = siteRoot + 'lib/' + item.repo_id + '/file' + item.file_path;
      return (
        <tr key={index}>
          <td>{item.repo_name}</td>
          <td><a href={fileUrl} target="_blank">{item.file_path}</a></td>
          <td>{item.reporter}</td>
          <td>{item.abuse_type}</td>
          <td>{item.description}</td>
          <td>{moment(item.time).format('YYYY-MM-DD')}</td>
          <td><p onClick={this.updateAbuseReport.bind(this, handled, abuseReportId)}
            className="op-target ellipsis ellipsis-op-target cursor-pointer"
          >{gettext(item.handled.toString())}</p></td>
        </tr>
      );
    });

    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Abuse Reports')}</h3>
            </div>
            <div className="cur-view-content">
              <table className={`table-hover`}>
                <thead>
                    <tr>
                      <th width="20%">{gettext('Library')}</th>
                      <th width="20%">{gettext('File')}</th>
                      <th width="10%">{gettext('Reporter')}</th>
                      <th width="15%">{gettext('Abuse Type')}</th>
                      <th width="20%">{gettext('Description')}</th>
                      <th width="10%">{gettext('Time')}</th>
                      <th width="5%">{gettext('Handled')}</th>
                    </tr>
                </thead>
                <tbody>
                  {AbuseReportList}
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
