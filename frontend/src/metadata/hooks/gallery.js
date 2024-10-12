import React, { useState, createContext, useContext, useCallback } from 'react';

const GalleryContext = createContext();

export const GalleryProvider = ({ children }) => {
  const [currentImage, setCurrentImage] = useState(null);

  const updateCurrentImage = useCallback((image) => {
    setCurrentImage(image);
  }, []);

  return (
    <GalleryContext.Provider value={{ currentImage, updateCurrentImage }}>
      {children}
    </GalleryContext.Provider>
  );
};

export const useGallery = () => {
  const context = useContext(GalleryContext);

  if (!context) {
    throw new Error('\'GalleryContext\' is null');
  }

  return context;
};
