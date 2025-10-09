import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import useResizeObserver from '../useResizeObserver';

export const BarChart = ({ data, unit }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const { width: containerW } = useResizeObserver(containerRef);

  const isDark = document.body.getAttribute('data-bs-theme') === 'dark';

  useEffect(() => {
    if (!data || data.length === 0) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = container.offsetWidth;
    const maxBarWidth = 24;
    const minGap = 12;

    const maxValue = d3.max(data, d => d.value);
    const yAxisTickFormat = maxValue > 1000 ? d3.format('.1s') : d3.format('d'); // eg: 1200 -> 1.2k

    const tempSvg = d3.select('body').append('svg').style('visibility', 'hidden');
    const tempText = tempSvg.append('text')
      .style('font-size', '12px')
      .text(yAxisTickFormat(maxValue));
    const maxLabelWidth = tempText.node().getBBox().width;
    tempSvg.remove();

    const margin = {
      top: 15,
      right: 20,
      bottom: 60,
      left: Math.max(28, maxLabelWidth + 10)
    };

    const chartWidth = containerWidth;
    const width = Math.max(0, chartWidth - margin.left - margin.right);
    const height = 250 - margin.top - margin.bottom;

    const yScale = d3.scaleLinear().domain([0, maxValue]).range([height, 0]).nice();

    const g = svg
      .attr('width', chartWidth)
      .attr('height', 250)
      .attr('viewBox', `0 0 ${chartWidth} 250`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, width])
      .paddingInner(0.2)
      .paddingOuter(0.1);
    const yAxis = g.append('g')
      .call(d3.axisLeft(yScale)
        .tickSize(-width)
        .tickFormat(yAxisTickFormat)
        .ticks(4)
      );

    yAxis.selectAll('text')
      .style('font-size', '12px')
      .style('fill', 'var(--bs-body-secondary-color)')
      .style('color', 'var(--bs-body-secondary-color)');

    yAxis.selectAll('.tick line')
      .style('stroke', isDark ? 'var(--bs-border-color)' : '#f5f5f5')
      .style('stroke-width', 1)
      .style('opacity', 0.7);

    yAxis.select('.domain').remove();

    const bandwidth = xScale.bandwidth();
    const actualBarWidth = Math.min(maxBarWidth, Math.max(4, bandwidth - minGap));

    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('path')
      .attr('class', 'bar')
      .attr('fill', '#ff9800')
      .attr('d', d => {
        const x = xScale(d.name) + (bandwidth - actualBarWidth) / 2;
        const width = actualBarWidth;
        const height = 0;
        const y = height;
        const radius = Math.min(4, actualBarWidth / 6);

        return `M${x},${y}
                L${x},${y - height + radius}
                Q${x},${y - height} ${x + radius},${y - height}
                L${x + width - radius},${y - height}
                Q${x + width},${y - height} ${x + width},${y - height + radius}
                L${x + width},${y}
                Z`;
      })
      .transition()
      .duration(400)
      .delay((d, i) => i * 100)
      .attr('d', d => {
        const x = xScale(d.name) + (bandwidth - actualBarWidth) / 2;
        const width = actualBarWidth;
        const barHeight = height - yScale(d.value);
        const y = height;
        const radius = Math.min(4, barHeight / 2, actualBarWidth / 6);

        if (barHeight <= 0) return '';

        return `M${x},${y}
                L${x},${y - barHeight + radius}
                Q${x},${y - barHeight} ${x + radius},${y - barHeight}
                L${x + width - radius},${y - barHeight}
                Q${x + width},${y - barHeight} ${x + width},${y - barHeight + radius}
                L${x + width},${y}
                Z`;
      });

    const xAxis = g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickSize(0));

    xAxis.selectAll('text').remove();

    xAxis.selectAll('.custom-tick-text')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'custom-tick-text')
      .attr('transform', d => `translate(${xScale(d.name) + xScale.bandwidth() / 2}, 0)`)
      .each(function (d) {
        const tickGroup = d3.select(this);
        const dateText = d.name;

        const monthYearMatch = dateText.match(/^([A-Za-z]{3,})\s+(\d{4})$/);
        if (monthYearMatch) {
          const month = monthYearMatch[1];
          const year = monthYearMatch[2];

          tickGroup.append('text')
            .attr('x', 0)
            .attr('y', 12)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', 'var(--bs-body-secondary-color)')
            .style('color', 'var(--bs-body-secondary-color)')
            .text(month);

          tickGroup.append('text')
            .attr('x', 0)
            .attr('y', 26)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', 'var(--bs-body-secondary-color)')
            .style('color', 'var(--bs-body-secondary-color)')
            .text(year);
        } else {
          tickGroup.append('text')
            .attr('x', 0)
            .attr('y', 16)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', 'var(--bs-body-secondary-color)')
            .style('color', 'var(--bs-body-secondary-color)')
            .text(dateText.length > 8 ? dateText.substring(0, 6) + '...' : dateText);
        }
      });

    xAxis.select('.domain').remove();

    g.selectAll('.value-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', d => xScale(d.name) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.value) - 4)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', 'var(--bs-body-secondary-color)')
      .style('color', 'var(--bs-body-secondary-color)')
      .style('opacity', 0)
      .text(d => yAxisTickFormat(d.value))
      .transition()
      .duration(400)
      .delay((d, i) => i * 100 + 400)
      .style('opacity', 1);

    g.selectAll('.bar')
      .on('mouseover', function (event, d) {
        d3.select(this).transition().duration(200).attr('fill', '#e65100');
      })
      .on('mouseout', function (event, d) {
        d3.select(this).transition().duration(200).attr('fill', '#ff9800');
      });

  }, [data, unit, isDark, containerW]);

  const barWidth = 24;
  const minBarSpacing = 24;
  const totalBarWidth = barWidth + minBarSpacing;

  const maxValue = data ? d3.max(data, d => d.value) : 0;
  const yAxisTickFormat = maxValue > 1000 ? d3.format('.1s') : d3.format('d');
  const estimatedLabelWidth = yAxisTickFormat(maxValue).length * 7;
  const estimatedLeftMargin = Math.max(20, estimatedLabelWidth + 15);
  const estimatedMargins = estimatedLeftMargin + 30;

  const requiredWidth = (data?.length || 0) * totalBarWidth + estimatedMargins;
  const needsScrolling = requiredWidth > (containerRef.current?.offsetWidth || 400);

  return (
    <div ref={containerRef} className="bar-chart-responsive" style={{
      overflowX: needsScrolling ? 'auto' : 'visible',
      overflowY: 'hidden',
    }}>
      <svg ref={svgRef} style={{
        width: needsScrolling ? 'fit-content' : '100%',
        height: '250px',
        minWidth: needsScrolling ? 'auto' : '100%'
      }}>
      </svg>
    </div>
  );
};

export const HorizontalBarChart = ({ data }) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const { width: containerW, height: containerH } = useResizeObserver(containerRef);

  const isDark = document.body.getAttribute('data-bs-theme') === 'dark';

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
      bottom: 30,
      left: isMobile ? 100 : 120
    };

    const width = Math.max(350, containerWidth - margin.left - margin.right);

    const minBarSpacing = 26;
    const barHeight = 18;
    const totalItemHeight = barHeight + minBarSpacing;
    const requiredContentHeight = data.length * totalItemHeight;

    const containerHeight = container.offsetHeight || 340;
    const availableHeight = containerHeight - margin.top - margin.bottom;

    const shouldScroll = requiredContentHeight > availableHeight;
    const svgHeight = shouldScroll ? requiredContentHeight + margin.top + margin.bottom : containerHeight;

    const actualContentHeight = shouldScroll ? requiredContentHeight : availableHeight;
    const centerOffset = shouldScroll ? 0 : Math.max(0, (availableHeight - requiredContentHeight) / 2);

    const g = svg
      .attr('width', '100%')
      .attr('height', svgHeight)
      .attr('viewBox', `0 0 ${containerWidth} ${svgHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
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

    const xScale = d3.scaleLinear().domain([0, adjustedMax]).range([0, width - 60]);

    const yScale = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([centerOffset, centerOffset + (shouldScroll ? requiredContentHeight : Math.min(requiredContentHeight, availableHeight))])
      .paddingInner(minBarSpacing / totalItemHeight)
      .paddingOuter(0.1);

    const xAxis = g.append('g')
      .attr('transform', `translate(0,${actualContentHeight})`)
      .call(d3.axisBottom(xScale)
        .tickValues([0, finalStepSize, finalStepSize * 2, finalStepSize * 3, adjustedMax])
        .tickFormat(d3.format('d'))
        .tickSize(-actualContentHeight)
      );

    xAxis.selectAll('text')
      .style('font-size', isMobile ? '10px' : '11px')
      .style('color', '#666')
      .attr('dy', '20px');

    xAxis.selectAll('.tick line')
      .style('stroke', isDark ? 'var(--bs-border-color)' : '#f5f5f5')
      .style('stroke-width', 1);

    xAxis.select('.domain').remove();

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
        return `M0,${y} L${width},${y} L${width},${y + height} L0,${y + height} Z`;
      })
      .transition()
      .duration(400)
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

    const yAxisGroup = g.append('g').attr('class', 'y-axis');

    data.forEach((d, i) => {
      const yPos = yScale(d.name) + yScale.bandwidth() / 2;
      const itemGroup = yAxisGroup.append('g').attr('transform', `translate(0, ${yPos})`);
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
        .duration(400)
        .delay(i * 100)
        .style('opacity', 1);

      const nameX = avatarCenterX + 14 + 12;
      const maxNameWidth = 70;

      const nameText = itemGroup.append('text')
        .attr('x', nameX)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'start')
        .style('font-size', '13px')
        .style('fill', isDark ? 'var(--bs-body-secondary-color)' : '#333')
        .style('color', isDark ? 'var(--bs-body-secondary-color)' : '#333');

      itemGroup.select('image').append('title').text(d.displayName);
      itemGroup.select('text').append('title').text(d.displayName);

      nameText.text(d.displayName);
      let textWidth = nameText.node().getBBox().width;

      if (textWidth > maxNameWidth) {
        let truncatedName = d.displayName;
        while (truncatedName.length > 3) {
          truncatedName = truncatedName.slice(0, -1);
          nameText.text(truncatedName + '...');
          textWidth = nameText.node().getBBox().width;
          if (textWidth <= maxNameWidth) break;
        }
      }
    });

    g.selectAll('.value-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', d => xScale(d.value) + 4)
      .attr('y', d => barY(d) + barHeight / 2)
      .attr('dy', '0.35em')
      .style('font-size', '12px')
      .style('fill', '#666')
      .style('color', '#666')
      .style('opacity', 0)
      .text(d => d.value)
      .transition()
      .duration(400)
      .delay((d, i) => i * 100 + 400)
      .style('opacity', 1);

  }, [data, isDark, containerW, containerH]);

  const minBarSpacing = 26;
  const barHeight = 18;
  const totalItemHeight = barHeight + minBarSpacing;
  const requiredHeight = (data?.length || 0) * totalItemHeight;
  const needsScrolling = requiredHeight > 300;

  return (
    <div ref={containerRef} style={{
      width: '100%',
      height: '340px',
      overflowY: needsScrolling ? 'auto' : 'visible',
      overflowX: 'hidden'
    }}>
      <svg ref={svgRef} style={{
        width: '100%',
        height: needsScrolling ? 'auto' : '100%',
        minHeight: '100%'
      }}>
      </svg>
    </div>
  );
};
