import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';
import Loading from '../../../components/loading';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const propTypes = {
  labels: PropTypes.array.isRequired,
  filesData: PropTypes.array.isRequired,
  suggestedMaxNumbers: PropTypes.number.isRequired,
  isLegendStatus: PropTypes.bool.isRequired,
  chartTitle: PropTypes.string.isRequired,
  isTitleCallback: PropTypes.bool,
  isTicksCallback: PropTypes.bool,
};

class StatisticChart extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      data: {},
      options: {}
    };
  }

  componentDidMount() {
    let { labels, filesData, isTitleCallback, isTicksCallback, suggestedMaxNumbers, isLegendStatus, chartTitle } = this.props;
    let _this = this;
    let data = {
      labels: labels,
      datasets: filesData
    };
    let options = {
      title: {
        display: true,
        fontSize: 14,
        text: chartTitle,
      },
      elements: {
        line: {
          fill: false,
          tension: 0, // disable bezier curves, i.e, draw straight lines
          borderWidth: 2
        }
      },
      legend: {
        display: isLegendStatus,
        labels: {
          usePointStyle: true
        }
      },
      tooltips: {
        callbacks: {
          label: function (tooltipItem, data) {
            if (isTitleCallback) {
              return _this.titleCallback(tooltipItem, data);
            }
            return data.datasets[tooltipItem.datasetIndex].label + ': ' + tooltipItem.yLabel;
          }
        }
      },
      layout: {
        padding: {
          right: 100,
        }
      },
      scales: {
        y: {
          display: true,
          beginAtZero: true,
          suggestedMax: suggestedMaxNumbers,
          ticks: {
            callback: function (value, index, values) {
              if (isTicksCallback) {
                return _this.ticksCallback(value, index, values);
              }
              return value;
            }
          }
        },
        x: {
          display: true,
          ticks: {
            maxTicksLimit: 20
          }
        }
      }
    };
    this.setState({
      data: data,
      options: options
    });
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    let data = {
      labels: nextProps.labels,
      datasets: nextProps.filesData
    };
    this.setState({ data: data });
  }

  titleCallback = (tooltipItem, data) => {
    return data.datasets[tooltipItem.datasetIndex].label + ': ' + Utils.bytesToSize(tooltipItem.yLabel);
  };

  ticksCallback = (value, index, values) => {
    return Utils.bytesToSize(value);
  };

  render() {

    let { data, options } = this.state;
    if (Object.keys(data).length === 0 && Object.keys(options).length === 0) {
      return <Loading />;
    }
    return (
      <>
        <Line data={data} options={options} />
      </>
    );
  }
}

StatisticChart.propTypes = propTypes;

export default StatisticChart;
