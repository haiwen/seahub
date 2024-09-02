import React, { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const OCRResultCanvas = ({
  className,
  data,
  style,
}) => {
  const ref = useRef(null);

  useEffect(() => {
    
  }, []);

  useEffect(() => {
    // 获取当前dom的位置信息
    const dom = document.getElementsByClassName('ril-image-current')[0];
    const { clientHeight, clientWidth } = dom;

    const canvas = ref.current;
    canvas.height = clientHeight;
    canvas.width = clientWidth;

    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    data.forEach(item => {
      console.log(item);
      // ctx.font = `${item.location.height / 1.5}px Arial`;
      ctx.fillStyle = '#fff';
      ctx.opacity = 1;
      // 根据位置信息绘制文字
      ctx.fillText(item.words, item.location.left, item.location.top);
    });
  }, [data]);

  const handleClick = useCallback((event) => {
    const canvas = ref.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const ctx = canvas.getContext('2d');

    const selectedText = data.find(item => {
      const fontMetrics = ctx.measureText(item.words);
      const textWidth = fontMetrics.width;
      const textHeight = item.location.height;
      const textX = item.location.left;
      const textY = item.location.top;

      // 判断点击位置是否在文字区域内
      return (
        x >= textX &&
        x <= textX + textWidth &&
        y >= textY &&
        y <= textY + textHeight
      );
    });
    if (selectedText) {
      // 给选中的文字添加背景色
      ctx.fillStyle = 'yellow'; // 这里设置背景色为黄色，你可以根据需要修改
      ctx.fillRect(selectedText.location.left, selectedText.location.top, ctx.measureText(selectedText.words).width, selectedText.location.height);
    }
  }, [data]);


  return (
    // <div style={{ position: 'relative' }}>
    //   <div style={{ position: 'absolute', zIndex: 1 }}></div>
      <canvas ref={ref} className={className} style={{ ...style, opacity: 0 }} onClick={handleClick}/>
    // </div>
  );
};

export default OCRResultCanvas;
