import React, { Component } from 'react';
import dayjs from 'dayjs';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import MainPanelTopbar from '../main-panel-topbar';
import StatisticNav from './statistic-nav';
import { gettext } from '../../../utils/constants';

class MetricCard extends Component {
  render() {
    const { metric } = this.props;
    return (
      <div className="metric-card">
        <div className="card mb-4">
          <div className="card-header">
            <div className="metric-title-row">
              <span className="metric-name">{metric.name}</span>
              <span className="metric-type">{metric.type}</span>
              {metric.help && (
                <span className="metric-help">
                  <span className="help-label">help:</span>
                  {metric.help}
                </span>
              )}
            </div>
          </div>
          <div className="card-body">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>{gettext('Node')}</th>
                  <th>{gettext('Component')}</th>
                  <th>{gettext('Collected Time')}</th>
                  <th>{gettext('Value')}</th>
                </tr>
              </thead>
              <tbody>
                {metric.data_points.map((point, index) => (
                  <tr key={index}>
                    <td>{point.labels.node}</td>
                    <td>{point.labels.component}</td>
                    <td>{dayjs(point.labels.collected_at).format('YYYY-MM-DD HH:mm:ss')}</td>
                    <td>{point.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}

class StatisticMetrics extends Component {
  constructor(props) {
    super(props);
    this.state = {
      metrics: [],
      loading: true,
      error: null
    };
  }

  componentDidMount() {
    this.getMetrics();
  }

  getMetrics = async () => {
    this.setState({ loading: true });
    try {
      const res = await systemAdminAPI.sysAdminStatisticMetrics();
      this.setState({
        metrics: res.data.metrics,
        loading: false
      });
    } catch (error) {
      this.setState({
        error: 'Failed to get metric data',
        loading: false
      });
    }
  };

  render() {
    const { metrics, loading, error } = this.state;

    return (
      <>
        <MainPanelTopbar {...this.props} />
        <div className="cur-view-container">
          <StatisticNav currentItem="metricsStatistic" />
          <div className="cur-view-content">
            {loading ? (
              <div className="loading-icon loading-tip"></div>
            ) : error ? (
              <div className="error text-danger">{error}</div>
            ) : (
              <div className="metrics-container">
                {metrics.map((metric, index) => (
                  <MetricCard key={index} metric={metric} />
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
}

const style = `
  <style>
    .metric-card .card-header {
      background-color: #f8f9fa;
      padding: 15px 20px;
    }
    
    .metric-card .metric-title-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    
    .metric-card .metric-name {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    
    .metric-card .metric-type {
      display: inline-block;
      padding: 2px 8px;
      font-size: 13px;
      font-weight: normal;
      color: #fff;
      background-color: #17a2b8;
      border-radius: 3px;
    }
    
    .metric-card .metric-help {
      color: #666;
      font-size: 14px;
    }
    
    .metric-card .help-label {
      color: #888;
      margin-right: 6px;
    }
    
    .metric-card .table {
      margin-bottom: 0;
    }
    
    .metric-card .table th {
      background-color: #f8f9fa;
      border-top: none;
    }
    
    .metric-card .table td {
      vertical-align: middle;
    }
    
    .metrics-container {
      padding: 1rem;
    }
    
    .loading-tip {
      margin: 100px auto;
      text-align: center;
    }
  </style>
`;

document.head.insertAdjacentHTML('beforeend', style);

export default StatisticMetrics;
