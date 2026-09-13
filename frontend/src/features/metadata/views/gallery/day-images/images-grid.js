import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import Image from '../image';

/*
  small size:   *
  medium size:  - -
                - -
  large size:   . . .
                . . .
                . . .
*/
const getStyles = (imagesCount, size) => {
  const { large, medium, small } = size;

  // One large image, one medium image, five small images
  if (imagesCount < 12) {
    return [
      [
        /*
          · · · - - *
          · · · - - *
          · · · * * *
        */
        { size: large, gridRow: '1 / 3', gridColumn: '1 / 3' },
        { size: medium, gridRow: '1 / 2', gridColumn: '4 / 5' },
        { size: small, gridRow: 1, gridColumn: 6 },
        { size: small, gridRow: 2, gridColumn: 6 },
        { size: small, gridRow: 3, gridColumn: 4 },
        { size: small, gridRow: 3, gridColumn: 5 },
        { size: small, gridRow: 3, gridColumn: 6 },
      ], [
        /*
          · · · * - -
          · · · * - -
          · · · * * *
        */
        { size: large, gridRow: '1 / 3', gridColumn: '1 / 3' },
        { size: small, gridRow: 1, gridColumn: 4 },
        { size: small, gridRow: 2, gridColumn: 4 },
        { size: medium, gridRow: '1 / 2', gridColumn: '5 / 6' },
        { size: small, gridRow: 3, gridColumn: 4 },
        { size: small, gridRow: 3, gridColumn: 5 },
        { size: small, gridRow: 3, gridColumn: 6 },
      ], [
        /*
          - - * · · ·
          - - * · · ·
          * * * · · ·
        */
        { size: medium, gridRow: '1 / 2', gridColumn: '1 / 2' },
        { size: small, gridRow: 1, gridColumn: 3 },
        { size: small, gridRow: 2, gridColumn: 3 },
        { size: small, gridRow: 3, gridColumn: 1 },
        { size: small, gridRow: 3, gridColumn: 2 },
        { size: small, gridRow: 3, gridColumn: 3 },
        { size: large, gridRow: '1 / 3', gridColumn: '4 / 6' },
      ], [
        /*
          * - - · · ·
          * - - · · ·
          * * * · · ·
        */
        { size: small, gridRow: 1, gridColumn: 1 },
        { size: small, gridRow: 2, gridColumn: 1 },
        { size: medium, gridRow: '1 / 2', gridColumn: '2 / 3' },
        { size: small, gridRow: 3, gridColumn: 1 },
        { size: small, gridRow: 3, gridColumn: 2 },
        { size: small, gridRow: 3, gridColumn: 3 },
        { size: large, gridRow: '1 / 3', gridColumn: '4 / 6' },
      ]
    ];
  }

  return [
    [
      /*
        - - * * * *
        - - * * - -
        * * * * - -
      */
      { size: medium, gridRow: '1 / 2', gridColumn: '1 / 2' },
      { size: small, gridRow: 1, gridColumn: 3 },
      { size: small, gridRow: 1, gridColumn: 4 },
      { size: small, gridRow: 1, gridColumn: 5 },
      { size: small, gridRow: 1, gridColumn: 6 },
      { size: small, gridRow: 2, gridColumn: 3 },
      { size: small, gridRow: 2, gridColumn: 4 },
      { size: small, gridRow: 3, gridColumn: 1 },
      { size: small, gridRow: 3, gridColumn: 2 },
      { size: small, gridRow: 3, gridColumn: 3 },
      { size: small, gridRow: 3, gridColumn: 4 },
      { size: medium, gridRow: '2 / 3', gridColumn: '5 / 6' },
    ], [
    /*
        * * * * - -
        - - * * - -
        - - * * * *
      */
      { size: small, gridRow: 1, gridColumn: 1 },
      { size: small, gridRow: 1, gridColumn: 2 },
      { size: small, gridRow: 1, gridColumn: 3 },
      { size: small, gridRow: 1, gridColumn: 4 },
      { size: medium, gridRow: '1 / 2', gridColumn: '5 / 6' },
      { size: medium, gridRow: '2 / 3', gridColumn: '1 / 2' },
      { size: small, gridRow: 2, gridColumn: 3 },
      { size: small, gridRow: 2, gridColumn: 4 },
      { size: small, gridRow: 3, gridColumn: 3 },
      { size: small, gridRow: 3, gridColumn: 4 },
      { size: small, gridRow: 3, gridColumn: 5 },
      { size: small, gridRow: 3, gridColumn: 6 },
    ], [
    /*
        - - * - - *
        - - * - - *
        * * * * * *
      */
      { size: medium, gridRow: '1 / 2', gridColumn: '1 / 2' },
      { size: small, gridRow: 1, gridColumn: 3 },
      { size: small, gridRow: 2, gridColumn: 3 },
      { size: medium, gridRow: '1 / 2', gridColumn: '4 / 5' },
      { size: small, gridRow: 1, gridColumn: 6 },
      { size: small, gridRow: 2, gridColumn: 6 },
      { size: small, gridRow: 3, gridColumn: 1 },
      { size: small, gridRow: 3, gridColumn: 2 },
      { size: small, gridRow: 3, gridColumn: 3 },
      { size: small, gridRow: 3, gridColumn: 4 },
      { size: small, gridRow: 3, gridColumn: 5 },
      { size: small, gridRow: 3, gridColumn: 6 },
    ], [
    /*
        - - * * * *
        - - * - - *
        * * * - - *
      */
      { size: medium, gridRow: '1 / 2', gridColumn: '1 / 2' },
      { size: small, gridRow: 1, gridColumn: 3 },
      { size: small, gridRow: 1, gridColumn: 4 },
      { size: small, gridRow: 1, gridColumn: 5 },
      { size: small, gridRow: 1, gridColumn: 6 },
      { size: small, gridRow: 2, gridColumn: 3 },
      { size: small, gridRow: 3, gridColumn: 1 },
      { size: small, gridRow: 3, gridColumn: 2 },
      { size: small, gridRow: 3, gridColumn: 3 },
      { size: medium, gridRow: '2 / 3', gridColumn: '4 / 5' },
      { size: small, gridRow: 2, gridColumn: 6 },
      { size: small, gridRow: 3, gridColumn: 6 },
    ]
  ];
};

const ImagesGrid = ({ images, selectedImageIds, size, imgEvents }) => {
  const imagesCount = useMemo(() => images.length, [images.length]);
  const day = images[0].day ? Number(images[0].day) : 0;

  const styles = useMemo(() => getStyles(imagesCount, size), [imagesCount, size]);
  const count = imagesCount < 12 ? 7 : 12;

  return (
    <>
      {images.slice(0, count).map((image, index) => {
        const styleInfo = styles[day % styles.length][index];
        return (
          <Image
            key={image.id}
            isSelected={selectedImageIds.includes(image.id)}
            img={image}
            size={styleInfo.size}
            useOriginalThumbnail={styleInfo.size > size.small}
            style={{ gridRow: styleInfo.gridRow, gridColumn: styleInfo.gridColumn }}
            {...imgEvents}
          />
        );
      })}
    </>
  );
};

ImagesGrid.propTypes = {
  images: PropTypes.array.isRequired,
  selectedImageIds: PropTypes.array,
  size: PropTypes.object.isRequired,
  imgEvents: PropTypes.object,
};

export default ImagesGrid;
