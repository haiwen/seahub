import React from 'react';

import videojs from 'video.js';
import 'videojs-hotkeys';
import 'video.js/dist/video-js.css';

class VideoPlayer extends React.Component {
  componentDidMount() {
    // instantiate Video.js
    this.player = videojs(this.videoNode, {
      ...this.props,
      plugins: {
        hotkeys: {
          alwaysCaptureHotkeys: true,
          volumeStep: 0.1,
          seekStep: 5,
          enableMute: true,
          enableFullscreen: true,
          enableNumbers: true
        }
      }
    }, function onPlayerReady() {});
    this.player.el().focus();
  }

  // destroy player on unmount
  componentWillUnmount() {
    if (this.player) {
      this.player.dispose();
    }
  }

  // wrap the player in a div with a `data-vjs-player` attribute
  // so videojs won't create additional wrapper in the DOM
  // see https://github.com/videojs/video.js/pull/3856
  render() {
    return (
      <div data-vjs-player>
        <video ref={ node => this.videoNode = node } className="video-js" style={{ display: 'block' }}></video>
      </div>
    );
  }
}

export default VideoPlayer;
