import React, { useEffect, useState } from 'react';
import { processor } from '@seafile/seafile-editor';
import PropTypes from 'prop-types';

const WechatViewer = ({ value }) => {
  const [innerHtml, setInnerHtml] = useState('');

  useEffect(() => {
    processor.process(value).then((result) => {
      const innerHtml = String(result).replace(/<a /ig, '<a target="_blank" tabindex="-1"');
      setInnerHtml(innerHtml);
    });
  }, [value]);

  return (<div className="sf-metadata-long-text-container article" dangerouslySetInnerHTML={{ __html: innerHtml }}></div>);
};

WechatViewer.propTypes = {
  value: PropTypes.string.isRequired,
};

export default WechatViewer;
