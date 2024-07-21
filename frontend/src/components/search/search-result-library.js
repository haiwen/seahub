import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../utils/utils';

function SearchResultLibrary(props) {
  const { item, isHighlight, onClick } = props;
  return (
    <li className={classnames('search-result-item', { 'search-result-item-highlight': isHighlight })} onClick={() => onClick(item)}>
      <img className='lib-item-img' src={Utils.getDefaultLibIconUrl(true)} alt="" />
      <div className="item-content d-flex justify-content-between align-items-center ellipsis">{item.name}</div>
    </li>
  );
}

SearchResultLibrary.propTypes = {
  item: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
  isHighlight: PropTypes.bool,
};

export default SearchResultLibrary;
