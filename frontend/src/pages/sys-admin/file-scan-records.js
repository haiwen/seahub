import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, loginUrl } from '../../utils/constants';


const tablePropTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  records: PropTypes.array.isRequired,
};

class Table extends Component {

  render() {
    let { loading, errorMsg, records } = this.props;

    if (loading) {
      return <span className="loading-icon loading-tip"></span>;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      return (
        <table width="100%" className="table table-hover table-vcenter">
          <thead>
            <tr>
              <th width="16%">{gettext('Library')}</th>
              <th width="30%">{gettext('ID')}</th>
              <th width="30%">{gettext('Path')}</th>
              <th width="12%">{gettext('Label')}</th>
              <th width="12%">{gettext('Suggestion')}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => {
              return (
                <Item key={index} record={record} />
              );
            })}
          </tbody>
        </table>
      );
    }
  }
}

Table.propTypes = tablePropTypes;


const itemPropTypes = {
  record: PropTypes.object.isRequired,
};

class Item extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    let record = this.props.record;

    return (
      <tr>
        <td>{record.repo_name}</td>
        <td>{record.repo_id}</td>
        <td>{record.path}</td>
        <td>{record.detail.label}</td>
        <td>{record.detail.suggestion}</td>
      </tr>
    );
  }
}

Item.propTypes = itemPropTypes;


class FileScanRecords extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      records: [],
    };
  }

  componentDidMount() {
    seafileAPI.listFileScanRecords().then((res) => {
      this.setState({
        loading: false,
        records: res.data.record_list,
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

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container" id="content-scan-records">
          <div className="cur-view-path">
            <h3 className="sf-heading">{gettext('Content Scan Records')}</h3>
          </div>
          <div className="cur-view-content">
            <Table 
              loading={this.state.loading}
              errorMsg={this.state.errorMsg}
              records={this.state.records}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default FileScanRecords;
