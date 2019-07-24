import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  selectedDirentList: PropTypes.array,
  onHideImageThumbnail: PropTypes.func
};

class DirentsDraggedImage extends React.Component {

  componentDidMount() {
    document.addEventListener('dragover', this.handleDragOver);
    document.addEventListener('drop', this.handleDrop);
  }

  componentWillUnmount() {
    document.removeEventListener('dragover', this.handleDragOver);
    document.removeEventListener('drop', this.handleDrop);
  }

  handleDragOver = (event) => {
    this.element.style.top = event.clientY + 'px';
    this.element.style.left = event.clientX + 'px';
  }

  handleDrop = (event) => {
    this.element.style.opacity = 0;
    this.props.onHideImageThumbnail();
  }

  render() {
    let{ selectedDirentList } = this.props;
    const inlineStyle = { 
      position: 'absolute', 
      opacity: 1, 
      pointerEvents: 'none', 
      display: 'block', 
      left: 0,
      top: 0,
    };
    return (
      <div style={inlineStyle} ref={element => this.element = element}>
        {selectedDirentList.map((thumbnailImgUrl, index) => {
          let iconUrl = Utils.getDirentIcon(thumbnailImgUrl);
          return (
            <div key={index}>
              {thumbnailImgUrl.encoded_thumbnail_src ?
                <img src={`${siteRoot}${thumbnailImgUrl.encoded_thumbnail_src}`} className="thumbnail cursor-pointer" alt="" /> :
                <img src={iconUrl} width="24" alt='' />
              }
            </div>
          );
        })}
      </div>
    );
  }
}

DirentsDraggedImage.propTypes = propTypes;

export default DirentsDraggedImage;
