import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, lang } from '../../../utils/constants';
import toaster from '../../toast';
import { Utils } from '../../../utils/utils';
import OpIcon from '../../op-icon';

dayjs.locale(lang);
dayjs.extend(relativeTime);

const RepoItem = ({ repo, filterRestoredRepo }) => {
  const repoID = useMemo(() => repo.repo_id, [repo]);
  const repoName = useMemo(() => repo.repo_name, [repo]);
  const localTime = useMemo(() => {
    const timeDate = dayjs.utc(repo.del_time).toDate();
    return dayjs(timeDate).fromNow();
  }, [repo]);
  const iconUrl = useMemo(() => Utils.getLibIconUrl(repo), [repo]);

  const [highlight, setHighlight] = useState(false);

  const onMouseEnter = useCallback(() => {
    setHighlight(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setHighlight(false);
  }, []);

  const restoreDeletedRepo = useCallback(() => {
    seafileAPI.restoreDeletedRepo(repoID).then(res => {
      const message = gettext('Successfully restored the library {library_name}.').replace('{library_name}', repoName);
      toaster.success(message);
      filterRestoredRepo(repoID);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID, repoName, filterRestoredRepo]);

  return (
    <tr
      className={highlight ? 'tr-highlight' : ''}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      tabIndex="0"
      onFocus={onMouseEnter}
    >
      <td className="text-center pl-2 pr-2"><img src={iconUrl} alt='' width="24" /></td>
      <td className="name">{repoName}</td>
      <td className="update">{localTime}</td>
      <td>
        <OpIcon
          title={gettext('Restore')}
          className={`sf2-icon-reply op-icon ${highlight ? '' : 'vh'}`}
          op={restoreDeletedRepo}
        />
      </td>
    </tr>
  );

};

RepoItem.propTypes = {
  repo: PropTypes.object.isRequired,
  filterRestoredRepo: PropTypes.func.isRequired,
};

export default RepoItem;
