import React from 'react';
import PropTypes from 'prop-types';
import AudioPlayer from '../audio-player';

import '../../css/audio-file-view.css';

const propTypes = {
  src: PropTypes.string
};

const { rawPath } = window.app.pageOptions;

class AudioFileContent extends React.Component {

  render() {
    const { src = rawPath } = this.props;
    const videoJsOptions = {
      autoplay: false,
      controls: true,
      preload: 'auto',
      sources: [{
        src: src
      }]
    };
    return (
      <div className="file-view-content flex-1 audio-file-view">
        <AudioPlayer { ...videoJsOptions } />
      </div>
    );
  }
}

AudioFileContent.propTypes = propTypes;

export default AudioFileContent;
