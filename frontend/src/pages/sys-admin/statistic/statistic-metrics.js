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
            <h5 className="mb-0">
              {metric.name}
              <small className="text-muted ml-2">{metric.type}</small>
            </h5>
            {metric.help && <p className="text-muted mb-0">{metric.help}</p>}
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

// 添加样式
const style = `
  <style>
    .metrics-container {
      padding: 1rem;
    }
    
    .metric-card .card-header {
      background-color: #f8f9fa;
    }
    
    .metric-card .table {
      margin-bottom: 0;
    }
    
    .metric-card .table td,
    .metric-card .table th {
      padding: 0.5rem;
    }
    
    .loading-tip {
      margin: 100px auto;
      text-align: center;
    }
  </style>
`;

document.head.insertAdjacentHTML('beforeend', style);

export default StatisticMetrics;
