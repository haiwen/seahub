import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import useResizeObserver from '../useResizeObserver';

const PieChart = ({ data }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const { width: containerW } = useResizeObserver(containerRef);

  const isDark = document.body.getAttribute('data-bs-theme') === 'dark';

  useEffect(() => {
    if (!data || data.length === 0) return;

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
    const maxRadius = 150;
    const padding = 20;
    const legendWidth = Math.min(160, Math.max(120, containerWidth * 0.25));
    // Always place legend on the right side of the pie
    const radius = Math.max(60, Math.min(maxRadius, (containerWidth - legendWidth - padding * 2) / 2));
    const pieSize = (radius + padding) * 2;

    const totalWidth = pieSize + legendWidth + padding;
    const totalHeight = pieSize;

    svg
      .attr('width', '100%')
      .attr('height', totalHeight)
      .attr('viewBox', `0 0 ${totalWidth} ${totalHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g')
      .attr('transform', `translate(${pieSize / 2}, ${pieSize / 2})`);

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

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

        const containerRect = container.getBoundingClientRect();
        tooltip
          .style('opacity', 1)
          .html(`<strong>${d.data.label}</strong><br/>Count: ${d.data.value}<br/>Percentage: ${percentage}%`)
          .style('left', (event.clientX - containerRect.left + 50) + 'px')
          .style('top', (event.clientY - containerRect.top + 100) + 'px');
      })
      .on('mousemove', function (event, d) {
        const containerRect = container.getBoundingClientRect();
        tooltip
          .style('left', (event.clientX - containerRect.left + 50) + 'px')
          .style('top', (event.clientY - containerRect.top + 100) + 'px');
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
    const minSlicePercentage = 0.04;

    arcs.filter(d => (d.data.value / total) >= minSlicePercentage)
      .each(function (d) {
        const textGroup = d3.select(this);
        const sliceCenterAngle = (d.startAngle + d.endAngle) / 2;
        const percentage = Math.round((d.data.value / total) * 100);
        const labelText = `${d.data.value}(${percentage}%)`;

        const isRightSide = sliceCenterAngle < Math.PI;
        const baselineRotation = (sliceCenterAngle * 180 / Math.PI) - 90;
        const textRotation = isRightSide ? baselineRotation : baselineRotation + 180;

        const measurementText = textGroup.append('text')
          .style('font-size', '13px')
          .text(labelText)
          .style('opacity', 0);

        const labelWidth = measurementText.node().getBBox().width;
        measurementText.remove();

        const edgeMargin = 10;
        const maxLabelDistance = radius - edgeMargin;
        const safeLabelDistance = Math.min(maxLabelDistance, radius - labelWidth - edgeMargin);

        const labelX = Math.cos(sliceCenterAngle - Math.PI / 2) * safeLabelDistance;
        const labelY = Math.sin(sliceCenterAngle - Math.PI / 2) * safeLabelDistance;

        const textAnchor = isRightSide ? 'start' : 'end';

        textGroup.append('text')
          .attr('transform', `translate(${labelX}, ${labelY}) rotate(${textRotation})`)
          .attr('text-anchor', textAnchor)
          .attr('dominant-baseline', 'central')
          .style('font-size', '13px')
          .style('font-weight', '400')
          .style('fill', 'none')
          .style('stroke', '#fff')
          .style('stroke-width', '2px')
          .style('stroke-linejoin', 'round')
          .text(labelText);

        // Then draw the main text (colored fill, no stroke)
        textGroup.append('text')
          .attr('transform', `translate(${labelX}, ${labelY}) rotate(${textRotation})`)
          .attr('text-anchor', textAnchor)
          .attr('dominant-baseline', 'central')
          .style('font-size', '13px')
          .style('font-weight', '400')
          .style('fill', '#666')
          .style('color', '#666')
          .text(labelText);
      });

    const legendX = pieSize + 15;
    const legendY = (pieSize / 2 - (data.length * 11));
    const legendContainer = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX}, ${legendY})`);

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
      .style('color', isDark ? 'var(--bs-body-secondary-color)' : '#333')
      .style('fill', isDark ? 'var(--bs-body-secondary-color)' : '#333')
      .text(d => {
        const maxLength = isMobile ? 10 : 15;
        const label = d.label.length > maxLength ? d.label.substring(0, maxLength) + '...' : d.label;
        return label;
      });

  }, [data, isDark, containerW]);

  useEffect(() => {
    const currentContainer = containerRef.current;
    return () => {
      d3.select(currentContainer).selectAll('.pie-chart-tooltip').remove();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', paddingLeft: '0' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default PieChart;
