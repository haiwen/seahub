import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import EmptyTip from '../../components/empty-tip';
import ActivityItem from './activity-item';

import '../../css/files-activities.css';

dayjs.locale(window.app.config.lang);

const contentPropTypes = {
  isLoadingMore: PropTypes.bool.isRequired,
  items: PropTypes.array.isRequired,
};

const FileActivitiesContent = ({ items, isLoadingMore }) => {
  const isDesktop = Utils.isDesktop();

  if (!items.length) {
    return <EmptyTip text={gettext('No more activities')}/>;
  }

  return (
    <Fragment>
      <table className="table-thead-hidden">
        {isDesktop ?
          <thead>
            <tr>
              <th width="8%">{/* avatar */}</th>
              <th width="15%">{gettext('User')}</th>
              <th width="20%">{gettext('Operation')}</th>
              <th width="37%">{gettext('File')} / {gettext('Library')}</th>
              <th width="20%">{gettext('Time')}</th>
            </tr>
          </thead>
          :
          <thead>
            <tr>
              <th width="15%"></th>
              <th width="53%"></th>
              <th width="32%"></th>
            </tr>
          </thead>
        }
        <tbody>
          {items.map((item, index) => {
            return (
              <ActivityItem
                key={index}
                isDesktop={isDesktop}
                item={item}
                index={index}
                items={items}
              />
            );
          })}
        </tbody>
      </table>
      {isLoadingMore ? <span className="loading-icon loading-tip"></span> : ''}
    </Fragment>
  );
};

FileActivitiesContent.propTypes = contentPropTypes;

export default FileActivitiesContent;
