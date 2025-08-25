import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { Button, Col, Row } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import Loading from '../../../components/loading';
import { PREDEFINED_FILE_TYPE_OPTION_KEY } from '../../constants/column/predefined';
import { useMetadataView } from '../../hooks/metadata-view';
import metadataAPI from '../../api';

import './index.css';

const FILE_TYPE_NAMES = {
  [PREDEFINED_FILE_TYPE_OPTION_KEY.PICTURE]: gettext('Pictures'),
  [PREDEFINED_FILE_TYPE_OPTION_KEY.DOCUMENT]: gettext('Documents'),
  [PREDEFINED_FILE_TYPE_OPTION_KEY.VIDEO]: gettext('Videos'),
  [PREDEFINED_FILE_TYPE_OPTION_KEY.AUDIO]: gettext('Audio'),
  [PREDEFINED_FILE_TYPE_OPTION_KEY.CODE]: gettext('Code'),
  [PREDEFINED_FILE_TYPE_OPTION_KEY.COMPRESSED]: gettext('Compressed'),
  [PREDEFINED_FILE_TYPE_OPTION_KEY.DIAGRAM]: gettext('Diagrams'),
  other: gettext('Others'),
};

const FILE_TYPE_COLORS = {
  [PREDEFINED_FILE_TYPE_OPTION_KEY.PICTURE]: '#ff6b6b',
  [PREDEFINED_FILE_TYPE_OPTION_KEY.DOCUMENT]: '#4ecdc4',
  [PREDEFINED_FILE_TYPE_OPTION_KEY.VIDEO]: '#45b7d1',
  [PREDEFINED_FILE_TYPE_OPTION_KEY.AUDIO]: '#96ceb4',
  [PREDEFINED_FILE_TYPE_OPTION_KEY.CODE]: '#ffeaa7',
  [PREDEFINED_FILE_TYPE_OPTION_KEY.COMPRESSED]: '#dda0dd',
  [PREDEFINED_FILE_TYPE_OPTION_KEY.DIAGRAM]: '#74b9ff',
  other: '#636e72',
};

// Helper function to get display name for file type
const getFileTypeDisplayName = (type) => {
  return FILE_TYPE_NAMES[type] || FILE_TYPE_NAMES.other;
};

const Statistics = () => {
  const { repoID } = useMetadataView();
  const [isLoading, setIsLoading] = useState(true);
  const [statisticsData, setStatisticsData] = useState(null);
  const [timeGrouping, setTimeGrouping] = useState('modified'); // 'modified' or 'created'

  // Fetch statistics data from metadata API
  const fetchStatisticsData = useCallback(async () => {
    if (!repoID) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Use the metadata statistics API
      const response = await metadataAPI.getStatistics(repoID);

      if (response.data) {
        // Transform API response to component format
        const transformedData = {
          fileTypeStats: response.data.file_type_stats.map(item => ({
            type: item.type,
            count: item.count
          })),
          timeStats: response.data.time_stats.map(item => ({
            year: item.year,
            count: item.count
          })),
          creatorStats: response.data.creator_stats.map(item => ({
            creator: item.creator,
            count: item.count
          })),
          totalFiles: response.data.summary_stats.total_files,
          totalCollaborators: response.data.summary_stats.total_collaborators
        };

        setStatisticsData(transformedData);
      } else {
        setStatisticsData(null);
      }
    } catch (error) {
      console.error('Error fetching statistics data:', error);
      toaster.danger(Utils.getErrorMsg(error));
      setStatisticsData(null);
    } finally {
      setIsLoading(false);
    }
  }, [repoID]);

  useEffect(() => {
    fetchStatisticsData();
  }, [fetchStatisticsData]);

  // Prepare pie chart data for file types
  const pieChartData = useMemo(() => {
    if (!statisticsData?.fileTypeStats) return [];

    console.log('Raw fileTypeStats:', statisticsData.fileTypeStats);

    const processed = statisticsData.fileTypeStats.map(item => ({
      label: FILE_TYPE_NAMES[item.type] || item.type,
      value: item.count,
      color: FILE_TYPE_COLORS[item.type] || '#636e72',
      type: item.type
    }));

    console.log('Processed pieChartData:', processed);
    return processed;
  }, [statisticsData]);

  // Prepare bar chart data for yearly distribution
  const yearlyChartData = useMemo(() => {
    if (!statisticsData?.timeStats) return [];

    return statisticsData.timeStats.map(item => ({
      name: item.year.toString(),
      value: item.count,
    }));
  }, [statisticsData]);

  // Prepare horizontal bar chart data for creators
  const creatorChartData = useMemo(() => {
    if (!statisticsData?.creatorStats) return [];

    return statisticsData.creatorStats.map(item => ({
      name: item.creator,
      value: item.count,
    }));
  }, [statisticsData]);

  const handleTimeGroupingChange = (newGrouping) => {
    setTimeGrouping(newGrouping);
    // Note: Time grouping change may require API enhancement in the future
    // For now, the API returns creation time data
  };

  if (isLoading) {
    return (
      <div className="statistics-view">
        <div className="statistics-loading">
          <Loading />
        </div>
      </div>
    );
  }

  if (!statisticsData) {
    return (
      <div className="statistics-view">
        <div className="statistics-error">
          {gettext('No data available for statistics')}
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-view">
      {/* Charts Section */}
      <Row className="statistics-charts">
        {/* File Type Distribution Pie Chart - Left */}
        <Col lg="6" md="12" className="chart-container">
          <div className="chart-wrapper">
            <h4>{gettext('Proportion of different types of files')}</h4>
            <div className="pie-chart-container">
              <PieChart data={pieChartData} />
            </div>
          </div>
        </Col>

        {/* Top Contributors Horizontal Bar Chart - Right */}
        <Col lg="6" md="12" className="chart-container">
          <div className="chart-wrapper">
            <h4>{gettext('Distributed by creator')}</h4>
            <div className="horizontal-bar-chart-container">
              {creatorChartData.length > 0 ? (
                <HorizontalBarChart data={creatorChartData} />
              ) : (
                <div className="no-data-message">
                  {gettext('No creator data available')}
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Summary Statistics - Top Section */}
      <Row className="statistics-summary-row">
        <Col lg="6" md="6" sm="12" className="summary-container">
          <div className="summary-card">
            <div className="summary-icon">📄</div>
            <div className="summary-content">
              <div className="summary-number">{statisticsData.totalFiles.toLocaleString()}</div>
              <div className="summary-label">{gettext('File count')}</div>
            </div>
          </div>
        </Col>
        <Col lg="6" md="6" sm="12" className="summary-container">
          <div className="summary-card">
            <div className="summary-icon">👥</div>
            <div className="summary-content">
              <div className="summary-number">{statisticsData.totalCollaborators.toLocaleString()}</div>
              <div className="summary-label">{gettext('Collaborator count')}</div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Time-based Distribution Bar Chart - Full Width Bottom */}
      <Row className="statistics-time-chart">
        <Col xs="12" className="chart-container">
          <div className="chart-wrapper">
            <div className="chart-header">
              <h4>{gettext('Distributed by time')}</h4>
              <div className="time-toggle">
                <Button
                  size="sm"
                  color={timeGrouping === 'created' ? 'primary' : 'outline-secondary'}
                  onClick={() => handleTimeGroupingChange('created')}
                >
                  {gettext('Created time')}
                </Button>
                <Button
                  size="sm"
                  color={timeGrouping === 'modified' ? 'primary' : 'outline-secondary'}
                  onClick={() => handleTimeGroupingChange('modified')}
                >
                  {gettext('Last modified time')}
                </Button>
              </div>
            </div>
            <div className="bar-chart-container">
              {yearlyChartData.length > 0 ? (
                <BarChart data={yearlyChartData} />
              ) : (
                <div className="no-data-message">
                  {gettext('No time-based data available')}
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

// Simple Pie Chart Component using D3
const PieChart = ({ data }) => {
  const svgRef = React.useRef();
  const containerRef = React.useRef();

  useEffect(() => {
    console.log('PieChart received data:', data);
    if (!data || data.length === 0) {
      console.log('PieChart: No data or empty data array');
      return;
    }

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Responsive sizing
    const containerWidth = container.offsetWidth;
    const isMobile = containerWidth < 480;
    const width = Math.min(400, containerWidth - 40);
    const height = width;
    const radius = Math.min(width, height) / 2 - (isMobile ? 20 : 40);

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(radius * 0.4)
      .outerRadius(radius);

    const labelArc = d3.arc()
      .innerRadius(radius * 0.7)
      .outerRadius(radius * 0.7);

    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    // Draw slices
    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color || '#95a5a6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('opacity', 0.9)
      .on('mouseover', function (event, d) {
        d3.select(this).style('opacity', 1);
      })
      .on('mouseout', function (event, d) {
        d3.select(this).style('opacity', 0.9);
      });

    // Add percentage labels only on larger slices and if not mobile
    if (!isMobile) {
      const total = d3.sum(data, d => d.value);
      arcs.filter(d => (d.data.value / total) > 0.05)
        .append('text')
        .attr('transform', d => `translate(${labelArc.centroid(d)})`)
        .style('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '500')
        .style('fill', '#333')
        .text(d => `${Math.round((d.data.value / total) * 100)}%`);
    }

    // Create legend
    const legendContainer = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width + (isMobile ? -160 : -140)}, 20)`);

    const legend = legendContainer.selectAll('.legend-item')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 22})`);

    legend.append('rect')
      .attr('width', 14)
      .attr('height', 14)
      .attr('rx', 2)
      .attr('fill', d => d.color || '#95a5a6');

    legend.append('text')
      .attr('x', 20)
      .attr('y', 7)
      .attr('dy', '0.35em')
      .style('font-size', isMobile ? '11px' : '12px')
      .style('fill', '#333')
      .text(d => {
        return `${d.label} (${d.value})`;
      });

  }, [data]);

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

// Simple Bar Chart Component using D3
const BarChart = ({ data }) => {
  const svgRef = React.useRef();
  const containerRef = React.useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Responsive sizing
    const containerWidth = container.offsetWidth;
    const isMobile = containerWidth < 768;
    const margin = {
      top: 20,
      right: isMobile ? 20 : 40,
      bottom: isMobile ? 50 : 60,
      left: isMobile ? 40 : 60
    };
    const width = Math.max(300, containerWidth - margin.left - margin.right);
    const height = isMobile ? 250 : 300;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, width])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([chartHeight, 0]);

    // Create gradient for bars
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'barGradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', chartHeight)
      .attr('x2', 0).attr('y2', 0);

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#ff9a56');

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#ffd446');

    // Bars with animation
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.name))
      .attr('y', chartHeight)
      .attr('width', xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', 'url(#barGradient)')
      .attr('rx', 3)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
      .transition()
      .duration(800)
      .delay((d, i) => i * 50)
      .attr('y', d => yScale(d.value))
      .attr('height', d => chartHeight - yScale(d.value));

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', isMobile ? '10px' : '11px')
      .style('fill', '#666')
      .style('font-weight', '500');

    // Y axis with grid lines
    const yAxis = g.append('g')
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(d3.format('d'))
        .ticks(isMobile ? 5 : 8)
      );

    yAxis.selectAll('text')
      .style('font-size', isMobile ? '10px' : '11px')
      .style('fill', '#666')
      .style('font-weight', '500');

    // Style grid lines
    yAxis.selectAll('.tick line')
      .style('stroke', '#f0f0f0')
      .style('stroke-width', 1);

    // Remove main axis lines
    yAxis.select('.domain').remove();
    g.select('.domain').remove();

    // Add value labels on top of bars
    g.selectAll('.value-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', d => xScale(d.name) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.value) - 8)
      .attr('text-anchor', 'middle')
      .style('font-size', isMobile ? '9px' : '10px')
      .style('fill', '#666')
      .style('font-weight', '600')
      .style('opacity', 0)
      .text(d => d.value)
      .transition()
      .duration(800)
      .delay((d, i) => i * 50 + 400)
      .style('opacity', 1);

  }, [data]);

  return (
    <div ref={containerRef} style={{ width: '100%', overflowX: 'auto' }}>
      <svg ref={svgRef} style={{ minWidth: '300px', width: '100%' }}></svg>
    </div>
  );
};

// Simple Horizontal Bar Chart Component using D3
const HorizontalBarChart = ({ data }) => {
  const svgRef = React.useRef();
  const containerRef = React.useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Responsive sizing
    const containerWidth = container.offsetWidth;
    const isMobile = containerWidth < 480;
    const margin = {
      top: 10,
      right: isMobile ? 30 : 40,
      bottom: 20,
      left: isMobile ? 80 : 100
    };
    const width = Math.max(300, containerWidth - margin.left - margin.right);
    const height = Math.min(350, Math.max(200, data.length * (isMobile ? 25 : 30))) - margin.top - margin.bottom;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([0, width]);

    const yScale = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, height])
      .padding(0.15);

    // Bars with gradient effect
    const gradient = svg.append('defs')
      .selectAll('linearGradient')
      .data(data)
      .enter()
      .append('linearGradient')
      .attr('id', (d, i) => `gradient${i}`)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', '100%').attr('y2', 0);

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', (d, i) => {
        const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b'];
        return colors[i % colors.length];
      });

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', (d, i) => {
        const colors = ['#764ba2', '#667eea', '#f5576c', '#f093fb', '#00f2fe', '#4facfe', '#a8edea'];
        return colors[i % colors.length];
      });

    // Bars
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.name))
      .attr('width', 0)
      .attr('height', yScale.bandwidth())
      .attr('fill', (d, i) => `url(#gradient${i})`)
      .attr('rx', 4)
      .transition()
      .duration(800)
      .delay((d, i) => i * 100)
      .attr('width', d => xScale(d.value));

    // Y axis - contributor names
    g.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .selectAll('text')
      .style('font-size', isMobile ? '10px' : '11px')
      .style('fill', '#333')
      .style('font-weight', '500');

    // Remove Y axis line
    g.select('.domain').remove();

    // Value labels at the end of bars
    g.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', d => Math.min(xScale(d.value) + 5, width - 30))
      .attr('y', d => yScale(d.name) + yScale.bandwidth() / 2)
      .attr('dy', '.35em')
      .style('font-size', isMobile ? '9px' : '10px')
      .style('fill', '#666')
      .style('font-weight', '500')
      .style('opacity', 0)
      .text(d => d.value)
      .transition()
      .duration(800)
      .delay((d, i) => i * 100 + 400)
      .style('opacity', 1);

  }, [data]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default Statistics;
