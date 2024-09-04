import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const useCancellableImageLoader = () => {
  const [imageSrc, setImageSrc] = useState(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadImage = (src) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const newAbortController = new AbortController();
    abortControllerRef.current = newAbortController;

    axios.get(src, {
      responseType: 'blob',
      signal: newAbortController.signal
    })
      .then(response => {
        const imageUrl = URL.createObjectURL(response.data);
        setImageSrc(imageUrl);
      })
      .catch(error => {
        if (!axios.isCancel(error)) {
          // console.error('Image failed to load', error);
        }
      });
  };

  return { imageSrc, loadImage };
};

export default useCancellableImageLoader;
