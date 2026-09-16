import React, { Component } from 'react';
import dayjs from 'dayjs';
import { systemAdminAPI } from '@/api/system-admin-api';
import Icon from '@/components/icon';
import Loading from '@/components/loading';
import Tooltip from '@/components/tooltip';
import { gettext } from '@/utils/constants';
import '@/css/system-stat.css';

class ComponentMetricsTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hoveredRow: null
    };
  }

  handleRowHover = (id) => {
    this.setState({ hoveredRow: id });
  };

  handleRowLeave = () => {
    this.setState({ hoveredRow: null });
  };

  render() {
    const { componentName, metrics } = this.props;
    const { hoveredRow } = this.state;
    return (
      <>
        <tr className="component-header">
          <td colSpan="4">
            <div className="component-title">
              <span>{componentName}</span>
            </div>
          </td>
        </tr>
        {metrics.map((metric) => (
          metric.data_points.map((point, pointIndex) => {
            const rowId = `${metric.name}-${point.labels.node}-${pointIndex}`;
            return (
              <tr key={rowId} className="metric-row">
                <td
                  onMouseEnter={() => this.handleRowHover(rowId)}
                  onMouseLeave={this.handleRowLeave}
                >
                  <div className="metric-info">
                    <div className="metric-name">
                      {metric.name.substring(metric.name.indexOf('_') + 1)}
                      {metric.help && (
                        <>
                          <span
                            className={`metric-help-icon${hoveredRow === rowId ? ' is-visible' : ''}`}
                            id={rowId}
                            aria-hidden="true"
                          >
                            <Icon symbol="help" />
                          </span>
                          <Tooltip target={rowId} placement='right' className="metric-tooltip">{metric.help}</Tooltip>
                        </>
                      )}
                    </div>
                  </div>
                </td>
                <td>{point.labels.node}</td>
                <td className="metric-value">{point.value}</td>
                <td>
                  <span className="collected-time">
                    {dayjs(point.labels.collected_at).format('YYYY-MM-DD HH:mm:ss')}
                  </span>
                </td>
              </tr>
            );
          })
        ))}
      </>
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
      <div className="cur-view-container">
        <div className="cur-view-content cur-metrics-content">
          {loading ? (
            <Loading />
          ) : error ? (
            <div className="error text-danger">{error}</div>
          ) : (
            <div className="metrics-container">
              <div className="card">
                <div className="card-body">
                  <table className="table table-striped mb-0">
                    <thead>
                      <tr>
                        <th className="metric-name-column">{gettext('Metrics')}</th>
                        <th className="metric-node-column">{gettext('Node')}</th>
                        <th className="metric-value-column">{gettext('Value')}</th>
                        <th className="metric-time-column">{gettext('Collected time')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedMetrics).map(([component, metrics]) => (
                        <ComponentMetricsTable
                          key={component}
                          componentName={component}
                          metrics={metrics}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default StatisticMetrics;
