
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const GalleryImage = ({ src, size, alt }) => {
  const [imageSrc, setImageSrc] = useState('');
  const [abortController] = useState(new AbortController());

  useEffect(() => {
    axios.get(src, { responseType: 'blob', signal: abortController.signal })
      .then(res => {
        const objectUrl = URL.createObjectURL(res.data);
        setImageSrc(objectUrl);
      });

    return () => {
      abortController.abort();
    };
  }, [src, abortController]);

  return (
    <div tabIndex={1} className='metadata-gallery-image-item' style={{ width: size, height: size, background: '#f1f1f1' }}>
      <img
        className="metadata-gallery-grid-image"
        src={imageSrc}
        alt={alt}
      />
    </div>
  );
};

GalleryImage.propTypes = {
  src: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired,
  alt: PropTypes.string,
};

GalleryImage.defaultProps = {
  alt: 'Gallery image',
};

export default GalleryImage;
