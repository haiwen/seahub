import { GALLERY_DATE_MODE, GALLERY_DEFAULT_GRID_GAP, GALLERY_YEAR_MODE_GRID_GAP } from '../../constants';

// Number of images per row
export const getColumns = (mode, zoomGear) => {
  switch (mode) {
    case GALLERY_DATE_MODE.YEAR: {
      return 2;
    }
    case GALLERY_DATE_MODE.MONTH: {
      return 3;
    }
    case GALLERY_DATE_MODE.DAY: {
      return 6;
    }
    default: {
      return 8 - zoomGear;
    }
  }
};

export const getImageSize = (containerWidth, columns, mode) => {
  if (!containerWidth || !columns) return {};
  const paddingLeft = Math.max(containerWidth / 9, 16);
  const contentWidth = containerWidth - paddingLeft * 2;
  const gapCount = columns - 1;
  switch (mode) {
    case GALLERY_DATE_MODE.YEAR:
    case GALLERY_DATE_MODE.MONTH: {
      const size = (contentWidth - GALLERY_YEAR_MODE_GRID_GAP * gapCount) / columns;
      return { large: size, medium: size, small: size };
    }
    case GALLERY_DATE_MODE.DAY: {
      const imagesWidth = contentWidth - GALLERY_DEFAULT_GRID_GAP * gapCount;
      const small = imagesWidth / 6;
      const large = small * 3 + GALLERY_DEFAULT_GRID_GAP * 2;
      const medium = small * 2 + GALLERY_DEFAULT_GRID_GAP;
      return { large, medium, small };
    }
    default: {
      const size = (containerWidth - 32 - GALLERY_DEFAULT_GRID_GAP * gapCount) / columns;
      return { large: size, medium: size, small: size };
    }
  }
};

export const getRowHeight = (imageSize, mode) => {
  if (!imageSize) return 0;
  if (mode === GALLERY_DATE_MODE.ALL) return imageSize.large + GALLERY_DEFAULT_GRID_GAP;
  return imageSize.large;
};
