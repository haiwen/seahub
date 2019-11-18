import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import toaster from '../../components/toast';
import Account from '../../components/common/account';


const recordItemPropTypes = {
  record: PropTypes.object.isRequired,
};

class RecordItem extends Component {

  constructor(props) {
    super(props);
    this.state = {
      handleStatus: this.props.record.has_handle,
      errorMsg: '',
    };
  }

  deleteVirusScanRecord = () => {
    seafileAPI.deleteVirusScanRecord(this.props.record.virus_id).then(() => {
      this.setState({
        handleStatus: !this.state.handleStatus,
      });
    }).catch((error) => {
      if (error.response) {
        this.setState({
          errorMsg: error.response.data.error_msg,
        });
        toaster.danger(this.state.errorMsg);
      }
    });
  }

  render() {
    let record = this.props.record;

    return (
      <tr>
        <td>{record.repo_name}</td>
        <td>{record.repo_owner}</td>
        <td>{record.file_path}</td>
        <td>
          {
            this.state.handleStatus ?
              <span style={{color: 'green'}}>{gettext('Handled')}</span> :
              <a style={{color: 'red', cursor: 'pointer'}} onClick={this.deleteVirusScanRecord}>{gettext('Delete')}</a>
          }
        </td>
      </tr>
    );
  }
}

RecordItem.propTypes = recordItemPropTypes;


const recordListPropTypes = {
  loading: PropTypes.bool.isRequired,
  isLoadingMore: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  records: PropTypes.array.isRequired,
};

class RecordList extends Component {

  render() {
    let { loading, isLoadingMore, errorMsg, records } = this.props;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      return (
        <Fragment>
          <table width="100%" className="table table-hover table-vcenter">
            <thead>
              <tr>
                <th width="28%">{gettext('Library')}</th>
                <th width="28%">{gettext('Owner')}</th>
                <th width="29%">{gettext('Virus File')}</th>
                <th width="15%">{gettext('Operations')}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, index) => {
                return (
                  <RecordItem key={index} record={record} />
                );
              })}
            </tbody>
          </table>
          {isLoadingMore ? <span className="loading-icon loading-tip"></span> : ''}
        </Fragment>
      );
    }
  }
}

RecordList.propTypes = recordListPropTypes;


class VirusScanRecords extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      isLoadingMore: false,
      currentPage: 1,
      hasMore: true,
      errorMsg: '',
      records: [],
    };
  }

  getMore() {
    let currentPage = this.state.currentPage;
    seafileAPI.listVirusScanRecords(currentPage).then((res) => {
      this.setState({
        isLoadingMore: false,
        records: [...this.state.records, ...res.data.record_list],
        currentPage: currentPage + 1,
        hasMore: res.data.record_list.length === 0 ? false : true,
      });
    }).catch((error) => {
      if (error.response) {
        this.setState({
          isLoadingMore: false,
          errorMsg: error.response.data.error_msg,
        });
        toaster.danger(this.state.errorMsg);
      }
    });
  }

  handleScroll = (event) => {
    if (!this.state.isLoadingMore && this.state.hasMore) {
      const clientHeight = event.target.clientHeight;
      const scrollHeight = event.target.scrollHeight;
      const scrollTop    = event.target.scrollTop;
      const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
      if (isBottom) {
        this.setState({isLoadingMore: true}, () => {
          this.getMore();
        });
      }
    }
  }

  componentDidMount() {
    let currentPage = this.state.currentPage;
    seafileAPI.listVirusScanRecords(currentPage).then((res) => {
      this.setState({
        loading: false,
        records: res.data.record_list,
        currentPage: currentPage + 1,
        hasMore: true,
      });
    }).catch((error) => {
      if (error.response) {
        this.setState({
          loading: false,
          errorMsg: error.response.data.error_msg,
        });
        toaster.danger(this.state.errorMsg);
      }
    });
  }

  render() {
    return (
      <Fragment>
        <div className="main-panel-north border-left-show">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu"></span>
          </div>
          <div className="common-toolbar">
            <Account isAdminPanel={true} />
          </div>
        </div>
        <div className="main-panel-center">
          <div className="cur-view-container" id="content-scan-records">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Virus Scan Records')}</h3>
            </div>
            <div className="cur-view-content" onScroll={this.handleScroll}>
              <RecordList 
                loading={this.state.loading}
                isLoadingMore={this.state.isLoadingMore}
                errorMsg={this.state.errorMsg}
                records={this.state.records}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default VirusScanRecords;
