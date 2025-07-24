import React from 'react';
import { gettext } from '../../../../utils/constants';

const CustomInfoWindow = ({ info }) => {
  const { address, title, tag } = info;
  const tagContent = Array.isArray(tag) && tag.length > 0 ? tag[0] : '';

  if (title) {
    return (
      <div className="geolocation-editor-info-window">
        <div className="w-100 d-flex align-items-center">
          <span className="title text-truncate" title={title}>{title}</span>
          <span className="close-btn">
            <i className="sf3-font sf3-font-x-01"></i>
          </span>
        </div>
        {tagContent && <span className="tag">{tagContent}</span>}
        <span className="address-tip">{gettext('Address')}</span>
        <span class='address text-truncate' title={address}>{address}</span>
        <div class='submit-btn btn btn-primary'>{gettext('Fill in')}</div>
      </div>
    );
  }
  return (
    <div class='geolocation-editor-info-window simple'>
      <div class='w-100 d-flex align-items-center'>
        <span class='address text-truncate simple' title={address}>{address}</span>
        <span class='close-btn'>
          <i class='sf3-font sf3-font-x-01'></i>
        </span>
      </div>
      <div class='submit-btn btn btn-primary'>{gettext('Fill in')}</div>
    </div>
  );
};

export default CustomInfoWindow;
