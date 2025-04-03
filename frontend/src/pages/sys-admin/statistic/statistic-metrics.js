import React, { Component } from 'react';
import dayjs from 'dayjs';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import MainPanelTopbar from '../main-panel-topbar';
import StatisticNav from './statistic-nav';
import { gettext } from '../../../utils/constants';

const MetricRow = ({ metric, point }) => (
  <tr>
    <td>
      <div className="metric-info">
        <div className="metric-name">{metric.name}</div>
      </div>
    </td>
    <td>{point.labels.node}</td>
    <td className="metric-value">{point.value}</td>
    <td>{dayjs(point.labels.collected_at).format('YYYY-MM-DD HH:mm:ss')}</td>
  </tr>
);

class ComponentMetricsTable extends Component {
  render() {
    const { componentName, metrics } = this.props;

    return (
      <div className="component-metrics-card">
        <div className="card mb-4">
          <div className="card-header">
            <h4 className="component-title">
              <i className="fas fa-server mr-2"></i>
              {componentName}
            </h4>
          </div>
          <div className="card-body">
            <table className="table table-hover table-striped mb-0">
              <thead>
                <tr>
                  <th width="40%">{gettext('Metric')}</th>
                  <th width="20%">{gettext('Node')}</th>
                  <th width="15%">{gettext('Value')}</th>
                  <th width="25%">{gettext('Collected time')}</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  metric.data_points.map((point, pointIndex) => (
                    <MetricRow
                      key={`${metric.name}-${pointIndex}`}
                      metric={metric}
                      point={point}
                    />
                  ))
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
      error: null,
      groupedMetrics: {}
    };
  }

  componentDidMount() {
    this.getMetrics();
  }

  groupMetricsByComponent = (metrics) => {
    const groups = {};
    metrics.forEach(metric => {
      if (metric.data_points && metric.data_points.length > 0) {
        metric.data_points.forEach(point => {
          const component = point.labels.component || 'Other';
          if (!groups[component]) {
            groups[component] = [];
          }
          const existingMetric = groups[component].find(m => m.name === metric.name);
          if (existingMetric) {
            existingMetric.data_points.push(point);
          } else {
            groups[component].push({
              ...metric,
              data_points: [point]
            });
          }
        });
      }
    });
    return groups;
  };

  getMetrics = async () => {
    this.setState({ loading: true });
    try {
      const res = await systemAdminAPI.sysAdminStatisticMetrics();
      const groupedMetrics = this.groupMetricsByComponent(res.data.metrics);
      this.setState({
        metrics: res.data.metrics,
        groupedMetrics,
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
    const { groupedMetrics, loading, error } = this.state;

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
                {Object.entries(groupedMetrics).map(([component, metrics]) => (
                  <ComponentMetricsTable
                    key={component}
                    componentName={component}
                    metrics={metrics}
                  />
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
    .component-metrics-card .card-header {
      background-color: #f8f9fa;
      padding: 15px 20px;
    }
    
    .component-metrics-card .component-title {
      margin: 0;
      color: #1e1e1e;
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
    }
    
    .metric-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .metric-name {
      font-weight: 500;
      color: #333;
    }
    
    .metric-value {
      font-family: monospace;
      font-size: 14px;
    }
    
    .metrics-container {
      padding: 1rem;
    }
    
    .loading-tip {
      margin: 100px auto;
      text-align: center;
    }
    
    .table th {
      background-color: #f8f9fa;
      border-top: none;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    
    .table td {
      vertical-align: middle;
    }
    
    .table-striped tbody tr:nth-of-type(odd) {
      background-color: rgba(0,0,0,.02);
    }
  </style>
`;

document.head.insertAdjacentHTML('beforeend', style);

export default StatisticMetrics;
