import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { Button, Col, Row } from 'reactstrap';
import { gettext, mediaUrl } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';
import Loading from '../../../components/loading';
import SortMenu from '../../../components/sort-menu';
import { PREDEFINED_FILE_TYPE_OPTION_KEY } from '../../constants/column/predefined';
import { useMetadataView } from '../../hooks/metadata-view';
import { useCollaborators } from '../../hooks/collaborators';
import { getCollaborator } from '../../utils/cell/column/collaborator';
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

const Statistics = () => {
  const { repoID } = useMetadataView();
  const { collaborators, getCollaborator: getCollaboratorFromHook } = useCollaborators();
  const [isLoading, setIsLoading] = useState(true);
  const [statisticsData, setStatisticsData] = useState(null);
  const [timeGrouping, setTimeGrouping] = useState('modified');
  const [creatorSortBy, setCreatorSortBy] = useState('count');
  const [creatorSortOrder, setCreatorSortOrder] = useState('desc');

  const fetchStatisticsData = useCallback(async () => {
    if (!repoID) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const response = await metadataAPI.getStatistics(repoID);

      if (response.data) {
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
      toaster.danger(Utils.getErrorMsg(error));
      setStatisticsData(null);
    } finally {
      setIsLoading(false);
    }
  }, [repoID]);

  useEffect(() => {
    fetchStatisticsData();
  }, [fetchStatisticsData]);

  const pieChartData = useMemo(() => {
    if (!statisticsData?.fileTypeStats) return [];

    const processed = statisticsData.fileTypeStats.map(item => ({
      label: FILE_TYPE_NAMES[item.type] || item.type,
      value: item.count,
      color: FILE_TYPE_COLORS[item.type] || '#636e72',
      type: item.type
    }));

    return processed;
  }, [statisticsData]);

  const yearlyChartData = useMemo(() => {
    if (!statisticsData?.timeStats) return [];

    return statisticsData.timeStats.map(item => ({
      name: item.year.toString(),
      value: item.count,
    }));
  }, [statisticsData]);

  const creatorChartData = useMemo(() => {
    if (!statisticsData?.creatorStats) return [];

    const processed = statisticsData.creatorStats.map(item => {
      const collaborator = getCollaboratorFromHook ? getCollaboratorFromHook(item.creator) : getCollaborator(collaborators, item.creator);
      return {
        name: item.creator,
        displayName: collaborator?.name || item.creator,
        avatarUrl: collaborator?.avatar_url || `${mediaUrl}/avatars/default.png`,
        value: item.count,
        collaborator: collaborator
      };
    });

    return processed.sort((a, b) => {
      let compareValue = 0;

      if (creatorSortBy === 'count') {
        compareValue = a.value - b.value;
      } else if (creatorSortBy === 'name') {
        compareValue = a.displayName.localeCompare(b.displayName);
      }

      return creatorSortOrder === 'asc' ? compareValue : -compareValue;
    });
  }, [statisticsData, collaborators, getCollaboratorFromHook, creatorSortBy, creatorSortOrder]);

  const handleTimeGroupingChange = (newGrouping) => {
    setTimeGrouping(newGrouping);
    // Note: Time grouping change may require API enhancement in the future
    // For now, the API returns creation time data
  };

  const handleCreatorSortChange = (item) => {
    const [sortBy, sortOrder] = item.value.split('-');
    setCreatorSortBy(sortBy);
    setCreatorSortOrder(sortOrder);
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
        <Col md="6" xs="12" className="chart-container file-type-chart-container">
          <div className="chart-wrapper">
            <h4>{gettext('Proportion of different types of files')}</h4>
            <div className="pie-chart-container">
              <PieChart data={pieChartData} />
            </div>
          </div>
        </Col>

        {/* Top Contributors Horizontal Bar Chart - Right */}
        <Col md="6" xs="12" className="chart-container file-creator-chart-container">
          <div className="chart-wrapper">
            <div className="chart-header d-flex justify-content-between align-items-center">
              <h4>{gettext('Distributed by creator')}</h4>
              <SortMenu
                sortBy={creatorSortBy}
                sortOrder={creatorSortOrder}
                sortOptions={[
                  { value: 'count-desc', text: gettext('Descending by count') },
                  { value: 'count-asc', text: gettext('Ascending by count') },
                  { value: 'name-desc', text: gettext('Descending by name') },
                  { value: 'name-asc', text: gettext('Ascending by name') }
                ]}
                onSelectSortOption={handleCreatorSortChange}
              />
            </div>
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

      <Row className="statistics-bottom-row">
        <Col md="6" xs="12" className="chart-container time-chart-container">
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
        <Col md="6" xs="12" className="chart-container summary-chart-container">
          <div className="chart-wrapper">
            <div className="summary-card">
              <div className="summary-icon">📄</div>
              <div className="summary-content">
                <div className="summary-number">{statisticsData.totalFiles.toLocaleString()}</div>
                <div className="summary-label">{gettext('File count')}</div>
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">👥</div>
              <div className="summary-content">
                <div className="summary-number">{statisticsData.totalCollaborators.toLocaleString()}</div>
                <div className="summary-label">{gettext('Collaborator count')}</div>
              </div>
            </div>
          </ div>
        </Col>
      </Row>
    </div>
  );
};

const PieChart = ({ data }) => {
  const svgRef = React.useRef();
  const containerRef = React.useRef();

  useEffect(() => {
    if (!data || data.length === 0) {
      return;
    }

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const tooltip = d3.select(container)
      .append('div')
      .attr('class', 'pie-chart-tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', '1000');

    const containerWidth = container.offsetWidth;
    const isMobile = containerWidth < 480;
    const radius = 150;
    const pieSize = (radius + 20) * 2;

    svg.attr('width', '100%').attr('height', pieSize);

    const g = svg.append('g')
      .attr('transform', `translate(${pieSize / 2}, ${pieSize / 2})`);

    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    const labelArc = d3.arc()
      .innerRadius(radius * 0.4)
      .outerRadius(radius * 0.4);

    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color || '#95a5a6')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('opacity', 0.9)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        const total = d3.sum(data, d => d.value);
        const percentage = Math.round((d.data.value / total) * 100);

        d3.select(this)
          .style('opacity', 1)
          .transition()
          .duration(200)
          .attr('transform', function (d) {
            const centroid = arc.centroid(d);
            return `translate(${centroid[0] * 0.05}, ${centroid[1] * 0.05})`;
          });

        tooltip
          .style('opacity', 1)
          .html(`<strong>${d.data.label}</strong><br/>Count: ${d.data.value}<br/>Percentage: ${percentage}%`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mousemove', function (event, d) {
        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function (event, d) {
        d3.select(this)
          .style('opacity', 0.9)
          .transition()
          .duration(200)
          .attr('transform', 'translate(0,0)');

        tooltip.style('opacity', 0);
      });

    const total = d3.sum(data, d => d.value);
    const minSlicePercentage = 0.08;

    arcs.filter(d => (d.data.value / total) >= minSlicePercentage)
      .each(function (d) {
        const centroid = labelArc.centroid(d);
        const textGroup = d3.select(this);

        const angle = (d.startAngle + d.endAngle) / 2;
        const isRightSide = angle < Math.PI;
        const rotation = (angle * 180 / Math.PI) - 90;

        const finalRotation = isRightSide ? rotation : rotation + 180;
        const textAnchor = isRightSide ? 'start' : 'end';

        const percentage = Math.round((d.data.value / total) * 100);
        const textContent = `${d.data.value}(${percentage}%)`;

        const maxTextRadius = radius - 10; // Keep 10px from edge
        const textRadius = Math.min(Math.sqrt(centroid[0] * centroid[0] + centroid[1] * centroid[1]), maxTextRadius * 0.8);

        const adjustedCentroid = [
          (centroid[0] / Math.sqrt(centroid[0] * centroid[0] + centroid[1] * centroid[1])) * textRadius,
          (centroid[1] / Math.sqrt(centroid[0] * centroid[0] + centroid[1] * centroid[1])) * textRadius
        ];

        textGroup.append('text')
          .attr('transform', `translate(${adjustedCentroid[0]}, ${adjustedCentroid[1]}) rotate(${finalRotation})`)
          .style('text-anchor', textAnchor)
          .style('font-size', '13px')
          .style('font-weight', '600')
          .style('color', '#666')
          .style('fill', '#666')
          .style('stroke', '#fff')
          .style('stroke-width', '1px')
          .text(textContent);
      });

    const legendContainer = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${pieSize + 15}, ${pieSize / 2 - (data.length * 11)})`); // Vertically center the legend

    const legend = legendContainer.selectAll('.legend-item')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 22})`);

    legend.append('rect')
      .attr('width', 20)
      .attr('height', 6)
      .attr('rx', 3)
      .attr('fill', d => d.color || '#95a5a6');

    legend.append('text')
      .attr('x', 26)
      .attr('y', 3)
      .attr('dy', '0.35em')
      .style('font-size', '13px')
      .style('fill', '#333')
      .style('font-weight', '500')
      .text(d => {
        const maxLength = isMobile ? 10 : 15;
        const label = d.label.length > maxLength ? d.label.substring(0, maxLength) + '...' : d.label;
        return label;
      });

  }, [data]);

  useEffect(() => {
    const currentContainer = containerRef.current;
    return () => {
      d3.select(currentContainer).selectAll('.pie-chart-tooltip').remove();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

const BarChart = ({ data }) => {
  const svgRef = React.useRef();
  const containerRef = React.useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const isMobile = containerWidth < 768;

    const margin = {
      top: 20,
      right: isMobile ? 20 : 40,
      bottom: isMobile ? 50 : 60,
      left: isMobile ? 40 : 60
    };
    const width = Math.max(300, containerWidth - margin.left - margin.right);
    const height = Math.max(200, containerHeight - margin.top - margin.bottom);

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, width])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([height, 0]);

    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('path')
      .attr('class', 'bar')
      .attr('fill', '#6395fa')
      .attr('d', d => {
        const x = xScale(d.name);
        const width = xScale.bandwidth();
        const height = 0;
        const y = height;
        const radius = 3;

        return `M${x},${y} 
                L${x},${y - height + radius} 
                Q${x},${y - height} ${x + radius},${y - height} 
                L${x + width - radius},${y - height} 
                Q${x + width},${y - height} ${x + width},${y - height + radius} 
                L${x + width},${y} 
                Z`;
      })
      .transition()
      .duration(800)
      .delay((d, i) => i * 50)
      .attr('d', d => {
        const x = xScale(d.name);
        const width = xScale.bandwidth();
        const barHeight = height - yScale(d.value);
        const y = height;
        const radius = Math.min(3, barHeight / 2);

        if (barHeight <= 0) return '';

        return `M${x},${y} 
                L${x},${y - barHeight + radius} 
                Q${x},${y - barHeight} ${x + radius},${y - barHeight} 
                L${x + width - radius},${y - barHeight} 
                Q${x + width},${y - barHeight} ${x + width},${y - barHeight + radius} 
                L${x + width},${y} 
                Z`;
      });

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', isMobile ? '10px' : '11px')
      .style('fill', '#666')
      .style('font-weight', '500');

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

    yAxis.selectAll('.tick line')
      .style('stroke', '#f5f5f5')
      .style('stroke-width', 1);

    yAxis.select('.domain').remove();
    g.select('.domain').remove();

    g.selectAll('.value-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', d => xScale(d.name) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.value) - 8)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
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
    <div ref={containerRef} className="bar-chart-responsive">
      <svg ref={svgRef} style={{ minWidth: '300px', width: '100%', height: '100%' }}></svg>
    </div>
  );
};

const HorizontalBarChart = ({ data }) => {
  const svgRef = React.useRef();
  const containerRef = React.useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = container.offsetWidth;
    const isMobile = containerWidth < 480;
    const margin = {
      top: 10,
      right: isMobile ? 60 : 80,
      bottom: 0,
      left: isMobile ? 100 : 120
    };
    const width = Math.max(350, containerWidth - margin.left - margin.right);
    const calculatedHeight = Math.min(400, Math.max(200, data.length * (isMobile ? 35 : 40))) - margin.top - margin.bottom;

    const containerHeight = container.offsetHeight || 300;
    const maxAvailableHeight = containerHeight - margin.top - margin.bottom - 20;
    const height = Math.max(calculatedHeight, Math.min(maxAvailableHeight, 350));

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxValue = d3.max(data, d => d.value);

    const getNiceNumber = (value, round = true) => {
      const exponent = Math.floor(Math.log10(value));
      const fraction = value / Math.pow(10, exponent);
      let niceFraction;

      if (round) {
        if (fraction < 1.5) niceFraction = 1;
        else if (fraction < 3) niceFraction = 2;
        else if (fraction < 7) niceFraction = 5;
        else niceFraction = 10;
      } else {
        if (fraction <= 1) niceFraction = 1;
        else if (fraction <= 2) niceFraction = 2;
        else if (fraction <= 5) niceFraction = 5;
        else niceFraction = 10;
      }

      return niceFraction * Math.pow(10, exponent);
    };

    const range = getNiceNumber(maxValue, false);
    const stepSize = getNiceNumber(range / 4, true);
    const niceMax = Math.ceil(maxValue / stepSize) * stepSize;

    const adjustedMax = Math.max(niceMax, stepSize * 4);
    const finalStepSize = adjustedMax / 4;

    const xScale = d3.scaleLinear()
      .domain([0, adjustedMax])
      .range([0, width - 60]);

    const yScale = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, height])
      .padding(0.3);

    const xAxis = g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .tickValues([0, finalStepSize, finalStepSize * 2, finalStepSize * 3, adjustedMax])
        .tickFormat(d3.format('d'))
        .tickSize(-height)
      );

    xAxis.selectAll('text')
      .style('font-size', isMobile ? '10px' : '11px')
      .style('fill', '#666')
      .style('font-weight', '500');

    xAxis.selectAll('.tick line')
      .style('stroke', '#f5f5f5')
      .style('stroke-width', 1);

    xAxis.select('.domain').remove();

    const barHeight = 18;
    const barY = d => yScale(d.name) + (yScale.bandwidth() - barHeight) / 2;

    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('path')
      .attr('class', 'bar')
      .attr('fill', '#6395fa')
      .attr('d', d => {
        const width = 0;
        const height = barHeight;
        const y = barY(d);
        return `M0,${y} 
                L${width},${y} 
                L${width},${y + height} 
                L0,${y + height} 
                Z`;
      })
      .transition()
      .duration(800)
      .delay((d, i) => i * 100)
      .attr('d', d => {
        const width = xScale(d.value);
        const height = barHeight;
        const y = barY(d);
        const radius = Math.min(3, width / 2);

        if (width <= 0) return '';

        return `M0,${y} 
                L${width - radius},${y} 
                Q${width},${y} ${width},${y + radius} 
                L${width},${y + height - radius} 
                Q${width},${y + height} ${width - radius},${y + height} 
                L0,${y + height} 
                Z`;
      });

    const yAxisGroup = g.append('g')
      .attr('class', 'y-axis');

    data.forEach((d, i) => {
      const yPos = yScale(d.name) + yScale.bandwidth() / 2;

      const itemGroup = yAxisGroup.append('g')
        .attr('transform', `translate(0, ${yPos})`);

      const avatarCenterX = -margin.left + 4 + 14;

      itemGroup.append('circle')
        .attr('cx', avatarCenterX)
        .attr('cy', 0)
        .attr('r', 14)
        .attr('fill', '#f0f0f0')
        .attr('stroke', '#ddd')
        .attr('stroke-width', 1);

      itemGroup.append('clipPath')
        .attr('id', `avatar-clip-${i}`)
        .append('circle')
        .attr('cx', avatarCenterX)
        .attr('cy', 0)
        .attr('r', 14);

      itemGroup.append('image')
        .attr('x', avatarCenterX - 14)
        .attr('y', -14)
        .attr('width', 28)
        .attr('height', 28)
        .attr('href', d.avatarUrl)
        .attr('clip-path', `url(#avatar-clip-${i})`)
        .style('opacity', 0)
        .transition()
        .duration(600)
        .delay(i * 100)
        .style('opacity', 1);

      const nameX = avatarCenterX + 14 + 12;
      itemGroup.append('text')
        .attr('x', nameX)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'start')
        .style('font-size', '13px')
        .style('fill', '#333')
        .style('font-weight', '500')
        .text(() => {
          const maxLength = isMobile ? 12 : 18;
          const name = d.displayName;
          return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
        })
        .attr('title', d.displayName);
    });

    g.selectAll('.value-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', d => xScale(d.value) + 10)
      .attr('y', d => barY(d) + barHeight / 2)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('fill', '#666')
      .style('font-weight', '600')
      .style('opacity', 0)
      .text(d => d.value)
      .transition()
      .duration(800)
      .delay((d, i) => i * 100 + 400)
      .style('opacity', 1);

  }, [data]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
    </div>
  );
};

export default Statistics;
