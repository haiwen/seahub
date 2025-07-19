import React, { Component } from 'react';
import dayjs from 'dayjs';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext } from '../../../utils/constants';
import { Tooltip } from 'reactstrap';

class ComponentMetricsTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hoveredRow: null,
      tooltipOpen: null
    };
  }

  toggleTooltip = (id) => {
    this.setState(prevState => ({
      tooltipOpen: prevState.tooltipOpen === id ? null : id
    }));
  };

  handleRowHover = (id) => {
    this.setState({ hoveredRow: id });
  };

  handleRowLeave = () => {
    this.setState({ hoveredRow: null });
  };

  render() {
    const { componentName, metrics } = this.props;
    const { hoveredRow, tooltipOpen } = this.state;
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
                          <i
                            className="sf3-font-help sf3-font"
                            id={rowId}
                            aria-hidden="true"
                            style={{
                              visibility: hoveredRow === rowId ? 'visible' : 'hidden',
                            }}
                          >
                          </i>
                          <Tooltip
                            placement='right'
                            isOpen={tooltipOpen === rowId && hoveredRow === rowId}
                            toggle={() => this.toggleTooltip(rowId)}
                            target={rowId}
                            delay={{ show: 200, hide: 0 }}
                            fade={true}
                            className="metric-tooltip"
                            hideArrow={true}
                          >
                            {metric.help}
                          </Tooltip>
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
      <div className="cur-metrics-content">
        {loading ? (
          <div className="loading-icon loading-tip"></div>
        ) : error ? (
          <div className="error text-danger">{error}</div>
        ) : (
          <div className="metrics-container">
            <div className="card">
              <div className="card-body">
                <table className="table table-striped mb-0">
                  <thead>
                    <tr>
                      <th width="40%">{gettext('Metrics')}</th>
                      <th width="20%">{gettext('Node')}</th>
                      <th width="15%">{gettext('Value')}</th>
                      <th width="25%">{gettext('Collected time')}</th>
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
    );
  }
}

const style = `
  <style>
    .cur-metrics-content {
      padding: 10px 16px;
      border: none;
    }

    .cur-metrics-content .card {
      margin-bottom: 20px;
    }

    .component-metrics-card .card-header {
      background: var(--bs-body-bg);
      padding: 16px 20px;
    }
    
    .metric-info {
      display: flex;
      flex-direction: column;
    }
    
    .metric-name {
      font-size: 14px;
    }

    .metrics-container {
      padding: 0;
    }
    
    .metrics-container .loading-tip {
      margin: 100px auto;
      text-align: center;
    }

    .card {
      box-shadow: none;
      border: none;
    }

    .card-body {
      border: none;
      padding: 0;
    }

    .component-header {
      background-color: var(--bs-th-secondary-bg) !important;
    }

    .component-header td {
      padding-top: 24px !important;
      padding-bottom: 2px !important;
      }

    .component-title {
      color: var(--bs-body-color);
      font-size: 16px;
      font-weight: 500;
    }

    .metric-row td {
      padding: 0;
      font-size: 14px;
    }

    .metrics-container .table {
      margin-bottom: 0;
      border: none;
    }

    .metrics-container .table td {
      vertical-align: middle;
      background: var(--bs-body-bg);
      border-bottom: 1px solid var(--bs-border-secondary-color);
      padding-left: 8px;
    }

    .metrics-container .table th {
      background: var(--bs-body-bg);
      border-bottom: 1px solid var(--bs-border-secondary-color);
      color: #666;
      font-size: 14px;
    }

    .sf3-font-help {
      font-size: 14px;
      color: #666;
      margin-left: 4px;
      opacity: 0.7;
      transition: opacity 0.2s;

    }
  </style>
`;

document.head.insertAdjacentHTML('beforeend', style);

export default StatisticMetrics;
