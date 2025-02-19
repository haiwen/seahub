import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import Image from '../image';

/*
  small size: *
  middle size: - -
               - -
  large size: . . .
              . . .
              . . .
*/
const ImagesGrid = ({ images, selectedImageIds, size, imgEvents }) => {
  const imagesCount = useMemo(() => images.length, [images.length]);
  const [firstImg, secondImg, ...others] = images;
  const day = firstImg.day ? Number(firstImg.day) : 0;

  // One large image, one medium image, five small images
  if (imagesCount < 12) {
    const i = imagesCount % 2;
    const firstImgOffset = i === 0 ? 0 : 3;
    const columnsOffset = i === 0 ? 3 : 0;
    const styles = [
      [
        { gridRow: '1 / 2', gridColumn: `${1 + columnsOffset} / ${2 + columnsOffset}` },
        { gridRow: 1, gridColumn: 3 + columnsOffset },
        { gridRow: 2, gridColumn: 3 + columnsOffset },
        { gridRow: 3, gridColumn: 1 + columnsOffset },
        { gridRow: 3, gridColumn: 2 + columnsOffset },
        { gridRow: 3, gridColumn: 3 + columnsOffset },
      ], [
        { gridRow: '1 / 2', gridColumn: `${2 + columnsOffset} / ${3 + columnsOffset}` },
        { gridRow: 1, gridColumn: 1 + columnsOffset },
        { gridRow: 2, gridColumn: 1 + columnsOffset },
        { gridRow: 3, gridColumn: 1 + columnsOffset },
        { gridRow: 3, gridColumn: 2 + columnsOffset },
        { gridRow: 3, gridColumn: 3 + columnsOffset },
      ], [
        { gridRow: '2 / 3', gridColumn: `${1 + columnsOffset} / ${2 + columnsOffset}` },
        { gridRow: 1, gridColumn: 1 + columnsOffset },
        { gridRow: 1, gridColumn: 2 + columnsOffset },
        { gridRow: 1, gridColumn: 3 + columnsOffset },
        { gridRow: 2, gridColumn: 3 + columnsOffset },
        { gridRow: 3, gridColumn: 3 + columnsOffset },
      ], [
        { gridRow: '2 / 3', gridColumn: `${2 + columnsOffset} / ${3 + columnsOffset}` },
        { gridRow: 1, gridColumn: 1 + columnsOffset },
        { gridRow: 1, gridColumn: 2 + columnsOffset },
        { gridRow: 1, gridColumn: 3 + columnsOffset },
        { gridRow: 2, gridColumn: 1 + columnsOffset },
        { gridRow: 3, gridColumn: 1 + columnsOffset },
      ]
    ];
    const style = styles[day % styles.length];

    return (
      <>
        <Image key={firstImg.id} isSelected={selectedImageIds.includes(firstImg.id)} img={firstImg} size={size.large} useOriginalThumbnail={true} style={{ gridRow: 1 / 3, gridColumn: `${1 + firstImgOffset} / ${3 + firstImgOffset}` }} {...imgEvents} />
        <Image key={secondImg.id} isSelected={selectedImageIds.includes(secondImg.id)} img={secondImg} size={size.middle} useOriginalThumbnail={true} style={style[0]} {...imgEvents} />
        {others.slice(0, 5).map((image, index) => {
          return (<Image key={image.id} isSelected={selectedImageIds.includes(image.id)} img={image} size={size.small} style={style[index + 1] || {}} {...imgEvents} />);
        })}
      </>
    );
  }

  // Three medium image, six small images
  // if (imagesCount < 12) {
  //   const styles = [
  //     [
  //       /*
  //         - - * * - -
  //         - - - - - -
  //         * * - - * *
  //       */
  //       { gridRow: '1 / 2', gridColumn: '1 / 2' },
  //       { gridRow: '1 / 2', gridColumn: '5 / 6' },
  //       { gridRow: '2 / 3', gridColumn: '3 / 4' },
  //       { gridRow: 1, gridColumn: 3 },
  //       { gridRow: 1, gridColumn: 4 },
  //       { gridRow: 3, gridColumn: 1 },
  //       { gridRow: 3, gridColumn: 2 },
  //       { gridRow: 3, gridColumn: 5 },
  //       { gridRow: 3, gridColumn: 6 },
  //     ], [
  //       /*
  //         * * - - * *
  //         - - - - - -
  //         - - * * - -
  //       */
  //       { gridRow: '1 / 2', gridColumn: '3 / 4' },
  //       { gridRow: '2 / 3', gridColumn: '1 / 2' },
  //       { gridRow: '2 / 3', gridColumn: '5 / 6' },
  //       { gridRow: 1, gridColumn: 1 },
  //       { gridRow: 1, gridColumn: 2 },
  //       { gridRow: 1, gridColumn: 5 },
  //       { gridRow: 1, gridColumn: 6 },
  //       { gridRow: 3, gridColumn: 3 },
  //       { gridRow: 3, gridColumn: 4 },
  //     ]
  //   ];

  //   const style = styles[day % styles.length];

  //   return (
  //     <>
  //       <Image key={firstImg.id} isSelected={selectedImageIds.includes(firstImg.id)} img={firstImg} size={size.middle} style={style[0]} {...imgEvents} />
  //       <Image key={secondImg.id} isSelected={selectedImageIds.includes(secondImg.id)} img={secondImg} size={size.middle} style={style[1]} {...imgEvents} />
  //       <Image key={others[0].id} isSelected={selectedImageIds.includes(others[0].id)} img={others[0]} size={size.middle} style={style[2]} {...imgEvents} />
  //       {others.slice(1, 7).map((image, index) => {
  //         return (<Image key={image.id} isSelected={selectedImageIds.includes(image.id)} img={image} size={size.small} style={style[index + 3] || {}} {...imgEvents} />);
  //       })}
  //     </>
  //   );
  // }

  // Two medium images, ten small images
  const styles = [
    [
      /*
        - - * * * *
        - - * * - -
        * * * * - -
      */
      { gridRow: '1 / 2', gridColumn: '1 / 2' },
      { gridRow: '2 / 3', gridColumn: '5 / 6' },
      { gridRow: 1, gridColumn: 3 },
      { gridRow: 1, gridColumn: 4 },
      { gridRow: 1, gridColumn: 5 },
      { gridRow: 1, gridColumn: 6 },
      { gridRow: 2, gridColumn: 3 },
      { gridRow: 2, gridColumn: 4 },
      { gridRow: 3, gridColumn: 1 },
      { gridRow: 3, gridColumn: 2 },
      { gridRow: 3, gridColumn: 3 },
      { gridRow: 3, gridColumn: 4 },
    ], [
      /*
        * * * * - -
        - - * * - -
        - - * * * *
      */
      { gridRow: '1 / 2', gridColumn: '5 / 6' },
      { gridRow: '2 / 3', gridColumn: '1 / 2' },
      { gridRow: 1, gridColumn: 1 },
      { gridRow: 1, gridColumn: 2 },
      { gridRow: 1, gridColumn: 3 },
      { gridRow: 1, gridColumn: 4 },
      { gridRow: 2, gridColumn: 3 },
      { gridRow: 2, gridColumn: 4 },
      { gridRow: 3, gridColumn: 3 },
      { gridRow: 3, gridColumn: 4 },
      { gridRow: 3, gridColumn: 5 },
      { gridRow: 3, gridColumn: 6 },
    ], [
      /*
        - - * - - *
        - - * - - *
        * * * * * *
      */
      { gridRow: '1 / 2', gridColumn: '1 / 2' },
      { gridRow: '1 / 2', gridColumn: '4 / 5' },
      { gridRow: 1, gridColumn: 3 },
      { gridRow: 1, gridColumn: 6 },
      { gridRow: 2, gridColumn: 3 },
      { gridRow: 2, gridColumn: 6 },
      { gridRow: 3, gridColumn: 1 },
      { gridRow: 3, gridColumn: 2 },
      { gridRow: 3, gridColumn: 3 },
      { gridRow: 3, gridColumn: 4 },
      { gridRow: 3, gridColumn: 5 },
      { gridRow: 3, gridColumn: 6 },
    ], [
      /*
        - - * * * *
        - - * - - *
        * * * - - *
      */
      { gridRow: '1 / 2', gridColumn: '1 / 2' },
      { gridRow: '2 / 3', gridColumn: '4 / 5' },
      { gridRow: 1, gridColumn: 3 },
      { gridRow: 1, gridColumn: 4 },
      { gridRow: 1, gridColumn: 5 },
      { gridRow: 1, gridColumn: 6 },
      { gridRow: 2, gridColumn: 3 },
      { gridRow: 2, gridColumn: 6 },
      { gridRow: 3, gridColumn: 1 },
      { gridRow: 3, gridColumn: 2 },
      { gridRow: 3, gridColumn: 3 },
      { gridRow: 3, gridColumn: 6 },
    ]
  ];
  const style = styles[day % styles.length];

  return (
    <>
      <Image key={firstImg.id} isSelected={selectedImageIds.includes(firstImg.id)} img={firstImg} size={size.middle} useOriginalThumbnail={true} style={style[0]} {...imgEvents} />
      <Image key={secondImg.id} isSelected={selectedImageIds.includes(secondImg.id)} img={secondImg} size={size.middle} useOriginalThumbnail={true} style={style[1]} {...imgEvents} />
      {others.slice(0, 10).map((image, index) => {
        return (<Image key={image.id} isSelected={selectedImageIds.includes(image.id)} img={image} size={size.small} style={style[index + 2] || {}} {...imgEvents} />);
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
