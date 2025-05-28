import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import Tooltip from './tooltip';

import './index.css';

const getXLabelInterval = (data, width) => {
  const minWidthPerLabel = 100;
  return Math.max(1, Math.floor(data.length / (width / minWidthPerLabel)));
};

const getDisplayXLables = (data, width) => {
  const labelInterval = getXLabelInterval(data, width);
  return data.filter((d, i) => i % labelInterval === 0).map(d => d.name);
};

const Chart = ({
  data = [],
  legends = [],
  title = '',
  margin = { top: 60, right: 30, bottom: 30, left: 30 },
  ySuggestedMax = 0,
  getDisplayValue = (v) => v,
}) => {
  const [tooltip, setTooltip] = useState({ display: false, position: { x: 0, y: 0 } });

  const ref = useRef(null);
  const svgRef = useRef(null);
  const hiddenLegendsRef = useRef([]);
  const tooltipData = useRef(null);

  const axisX = useRef(null);
  const axisY = useRef(null);

  const d3DataSource = useMemo(() => {
    return legends.map(legend => {
      const { key } = legend;
      return {
        ...legend,
        values: data.map(d => {
          return {
            key: key,
            name: d.name,
            value: d[key]
          };
        }),
      };
    });
  }, [data, legends]);

  const gridXCall = useCallback((x, { height }) => {
    return d3.axisBottom(x)
      .tickSizeOuter(0)
      .tickSize(height)
      .tickFormat('');
  }, []);

  const gridYCall = useCallback((y, { width }) => {
    return d3.axisLeft(y)
      .ticks(5)
      .tickSize(-width)
      .tickFormat('');
  }, []);

  const updateXY = useCallback((svg, x, y, displayLegends) => {
    // update y
    // nothing todo

    // update y
    // nice y
    let yMaxValue = d3.max(data, d => Math.max(...displayLegends.map(l => d[l.key] || 0)));
    if (ySuggestedMax) {
      yMaxValue = Math.max(ySuggestedMax, yMaxValue);
    }
    const niceEnd = d3.nice(0, yMaxValue, 5)[1];
    y.domain([0, niceEnd]);

  }, [ySuggestedMax, data]);

  const init = useCallback(() => {
    const { width: containerWidth } = ref.current.getBoundingClientRect();
    const width = containerWidth * 0.8;
    const height = width * 0.5;

    const style = {
      height: height - margin.top - margin.bottom,
      width: width - margin.left - margin.right,
    };

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const xDomain = data.map(d => d.name);
    const x = d3.scalePoint()
      .domain(xDomain)
      .range([0, style.width])
      .padding(.1);

    const y = d3.scaleLinear()
      .range([style.height, 0]);

    const tickValues = getDisplayXLables(data, style.width);

    return { svg, x, y, tickValues, style };
  }, [data, margin]);

  const updateAxis = useCallback((svg, x, y, tickValues, duration = 500) => {
    axisX.current
      .transition()
      .duration(duration)
      .call(d3.axisBottom(x).tickSizeOuter(0).tickValues(tickValues));

    axisY.current
      .transition()
      .duration(duration)
      .call(d3.axisLeft(y).tickSizeInner(0).ticks(5).tickFormat(getDisplayValue));
  }, [getDisplayValue]);

  const drawAxis = useCallback((svg, x, y, tickValues, { height }, d3Data) => {
    // axis
    const axis = svg
      .append('g')
      .attr('class', 'axis');

    // axis-x
    axisX.current = axis
      .append('g')
      .attr('class', 'axis-x')
      .attr('transform', `translate(0, ${height})`);

    // axis-y
    axisY.current = axis
      .append('g')
      .attr('class', 'axis-y');

    updateAxis(svg, x, y, tickValues, 0);
  }, [updateAxis]);

  const drawGrid = useCallback((svg, x, y, tickValues, { height, width }, d3Data) => {
    // grid
    const grid = svg.append('g')
      .attr('class', 'grid');

    // grid x
    const gridX = grid.append('g')
      .attr('class', 'grid-x')
      .call(gridXCall(x, { height }));

    // gridX tip
    const gridXTipLine = grid.append('line')
      .attr('class', 'grid-x-tip-line d-none')
      .attr('y1', 0)
      .attr('y2', height);

    gridX.selectAll('.tick')
      .append('rect')
      .attr('class', 'tick-interaction')
      .attr('x', -2.5)
      .attr('y', 0)
      .attr('width', 5)
      .attr('height', height)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .on('mouseover', function (event, d) {
        gridXTipLine
          .attr('x1', x(d))
          .attr('x2', x(d))
          .classed('d-none', false);

        svg.selectAll('.dot')
          .filter(dot => dot.name === d)
          .classed('highlight-dot', true);

        if (tooltipData.current?.title !== d) {
          let records = [];
          d3DataSource.forEach(d3DataItem => {
            const record = d3DataItem.values.find(v => v.name === d);
            if (record) {
              records.push({
                color: d3DataItem.color,
                name: d3DataItem.name,
                value: getDisplayValue(record.value),
              });
            }
          });
          tooltipData.current = {
            records: records,
            title: d
          };
        }

        setTooltip({
          display: true,
          position: {
            left: event.pageX + 10,
            top: event.pageY + 10,
          }
        });
      })
      .on('mouseout', function (event, d) {
        gridXTipLine
          .classed('d-none', true);

        svg.selectAll('.dot')
          .classed('highlight-dot', false);

        setTooltip({ display: false, position: { left: 0, top: 0 } });
        tooltipData.current = null;
      });

    // grid y
    const gridY = grid.append('g')
      .attr('class', 'grid-y')
      .call(gridYCall(y, { width }));
    gridY.selectAll('.tick')
      .classed('d-none', (d, i) => i === 0);
  }, [d3DataSource, getDisplayValue, gridXCall, gridYCall]);

  const drawData = useCallback((svg, x, y, tickValues, { height, width }, d3Data) => {
    // line
    const line = d3.line()
      .x(d => x(d.name))
      .y(d => y(d.value))
      .curve(d3.curveLinear);

    const dataGroups = svg.select('.groups').empty() ? svg.append('g')
      .attr('class', 'groups') : svg.select('.groups');

    const groups = dataGroups.selectAll('.group')
      .data(d3Data)
      .enter()
      .append('g')
      .attr('class', 'group');

    groups.append('path')
      .attr('class', 'line')
      .attr('d', d => line(d.values))
      .attr('fill', 'none')
      .attr('stroke', d => d.color);

    groups.each(function (group) {
      d3.select(this).selectAll('.dot')
        .data(group.values)
        .enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('cx', d => x(d.name))
        .attr('cy', d => y(d.value))
        .attr('fill', group.color);
    });

    dataGroups.selectAll('.line')
      .classed('fade-line', d => hiddenLegendsRef.current.includes(d.key))
      .attr('d', d => line(d.values))
      .transition()
      .duration(500);

    dataGroups.selectAll('.dot')
      .classed('fade-dot', d => hiddenLegendsRef.current.includes(d.key))
      .attr('cx', d => x(d.name))
      .attr('cy', d => y(d.value))
      .transition()
      .duration(500);

    dataGroups.exit().remove();

    // line and dot UI
    // groups
    //   .on('mouseover', function (event, d) {
    //     d3
    //       .select(this)
    //       .select('.line')
    //       .classed('highlight-line', true);

    //     d3
    //       .select(this)
    //       .selectAll('.dot')
    //       .classed('highlight-dot', true);

    //     svg.selectAll('.line')
    //       .filter(line => line.key !== d.key)
    //       .classed('fade-line', true);

    //     svg.selectAll('.dot')
    //       .filter(dot => dot.key !== d.key)
    //       .classed('fade-line', true);
    //   })
    //   .on('mouseout', function (event, d) {
    //     svg.selectAll('.line')
    //       .classed('highlight-line', false)
    //       .classed('fade-line', false);

    //     svg.selectAll('.dot')
    //       .classed('highlight-dot', false)
    //       .classed('fade-dot', false);
    //   });
  }, []);

  const drawLegend = useCallback((svg, x, y, tickValues, { height, width }, d3Data) => {
    const textMeasurer =
      svg.append('text')
        .attr('class', 'legend-text-measurer')
        .style('visibility', 'hidden')
        .style('font-size', '12px');

    const legendTextWidths = legends.map(legend => {
      const text = legend.name;
      textMeasurer.text(text);
      return textMeasurer.node().getComputedTextLength();
    });
    textMeasurer.remove();

    // legend
    // width: 20px
    // height: 6px
    // margin right: 16px
    // text and color gap: 8px
    // last one: margin right 0px
    // 44: width + margin right + gap
    const legendDisplayWidth = legendTextWidths.reduce((sum, cur) => sum + cur, 0) + legends.length * 44 - 16;
    const offset = (width - legendDisplayWidth) / 2;

    const legendsDom = svg.append('g')
      .attr('class', 'legends');

    const legend = legendsDom.selectAll('.legend')
      .data(d3Data)
      .enter()
      .append('g')
      .attr('class', 'legend')
      .on('click', function (event, d) {
        if (hiddenLegendsRef.current.includes(d.key)) {
          hiddenLegendsRef.current = hiddenLegendsRef.current.filter(l => l !== d.key);
        } else {
          hiddenLegendsRef.current = [...hiddenLegendsRef.current, d.key];
        }

        d3.select(this)
          .classed('hidden-legend', hiddenLegendsRef.current.includes(d.key));

        update(svg, x, y, tickValues, { height, width });
      });

    legend.append('rect')
      .attr('x', (d, i) => offset + legendTextWidths.slice(0, i).reduce((sum, cur) => sum + cur, 0) + i * 44)
      .attr('y', -20)
      .attr('width', 20)
      .attr('height', 6)
      .attr('rx', 3)
      .attr('fill', d => d.color)
      .attr('class', 'legend-color');

    legend.append('rect')
      .attr('x', (d, i) => offset + legendTextWidths.slice(0, i).reduce((sum, cur) => sum + cur, 0) + i * 44 + 20)
      .attr('y', -26.5)
      .attr('width', 8)
      .attr('height', 16.5)
      .attr('class', 'legend-gap');

    legend.append('text')
      .attr('x', (d, i) => offset + legendTextWidths.slice(0, i).reduce((sum, cur) => sum + cur, 0) + i * 44 + 28)
      .attr('y', -20)
      .attr('dy', '7px')
      .text(d => d.name)
      .attr('class', 'legend-text');

  // eslint-disable-next-line no-use-before-define
  }, [legends, update]);

  const drawTitle = useCallback((svg, x, y, tickValues, { height, width }, d3Data) => {
    if (!title) return;
    svg.append('text')
      .attr('class', 'title')
      .attr('x', width / 2)
      .attr('y', -40)
      .text(title);
  }, [title]);

  const update = useCallback((svg, x, y, tickValues, { width, height }) => {
    const displayLegends = legends.filter(legend => !hiddenLegendsRef.current.includes(legend.key));
    const d3Data = d3DataSource.filter(d => displayLegends.find(l => l.key === d.key));

    // update y
    updateXY(svg, x, y, displayLegends);

    // update axis
    updateAxis(svg, x, y, tickValues);

    // update grid
    svg.select('.grid-x')
      .transition()
      .duration(500)
      .call(gridXCall(x, { height }));

    svg.select('.grid-y')
      .transition()
      .duration(500)
      .call(gridYCall(y, { width }));

    drawData(svg, x, y, tickValues, { width, height }, d3Data);
  }, [legends, d3DataSource, updateXY, updateAxis, gridXCall, gridYCall, drawData]);

  const draw = useCallback((svg, x, y, tickValues, style) => {
    const displayLegends = legends.filter(legend => !hiddenLegendsRef.current.includes(legend.key));
    const d3Data = d3DataSource.filter(d => displayLegends.find(l => l.key === d.key));

    updateXY(svg, x, y, displayLegends);
    drawAxis(svg, x, y, tickValues, style);
    drawGrid(svg, x, y, tickValues, style, d3Data);
    drawData(svg, x, y, tickValues, style, d3Data);
    drawLegend(svg, x, y, tickValues, style, d3Data);
    drawTitle(svg, x, y, tickValues, style, d3Data);
  }, [legends, d3DataSource, updateXY, drawAxis, drawGrid, drawData, drawLegend, drawTitle]);

  const create = useCallback(() => {
    const { svg, x, y, tickValues, style } = init();
    draw(svg, x, y, tickValues, style);
  }, [init, draw]);

  const destroy = useCallback(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).selectAll('*').remove();
  }, []);

  const handleResize = useCallback(() => {
    destroy();
    create();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      destroy();
      window.removeEventListener('resize', handleResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleResize]);

  useEffect(() => {
    create();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sf-chart w-100 h-100" ref={ref}>
      <svg ref={svgRef} />
      {tooltip.display && (<Tooltip data={tooltipData.current} position={tooltip.position} />)}
    </div>
  );
};

export default Chart;
