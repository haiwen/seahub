import React, { useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Input } from 'reactstrap';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import { gettext, siteRoot } from '../../../utils/constants';
import metadataAPI from '../../api';
import isHotkey from 'is-hotkey';
import { isEnter } from '../../utils/hotkey';

dayjs.extend(relativeTime);

const theadData = [
  { width: '5%', text: '' },
  { width: '39%', text: gettext('Name') },
  { width: '34%', text: gettext('Original path') },
  { width: '11%', text: gettext('Size') },
  { width: '11%', text: gettext('Last Update') },
];

const FaceGroup = ({ repoID, group, onPhotoClick }) => {
  const [name, setName] = useState(group.name);
  const [isRenaming, setRenaming] = useState(false);
  const serverName = useRef(group.name);

  const showPhoto = useCallback((event, photo) => {
    event.preventDefault();
    onPhotoClick(photo);
  }, [onPhotoClick]);

  const changeName = useCallback((event) => {
    const value = event.target.value;
    if (name === value) return;
    setName(value);
  }, [name]);

  const renameName = useCallback(() => {
    setRenaming(true);
  }, []);

  const updateName = useCallback(() => {
    if (name === serverName.current) {
      setRenaming(false);
      return;
    }
    metadataAPI.updateFaceName(repoID, group.record_id, name).then(res => {
      serverName.current = name;
      setRenaming(false);
    }).catch(err => {
      const errorMsg = Utils.getErrorMsg(err);
      toaster.danger(errorMsg);
      setName(serverName.current);
      setRenaming(false);
    });
  }, [repoID, group, name]);

  const onRenameKeyDown = useCallback((event) => {
    if (isEnter(event)) {
      updateName();
    } else if (isHotkey('esc', event)) {
      setName(serverName.current);
      setRenaming(false);
    }
  }, [updateName]);

  return (
    <div key={group.record_id} className="sf-metadata-face-recognition-item">
      {isRenaming ?
        (<Input
          autoFocus
          value={name}
          onChange={changeName}
          onBlur={updateName}
          onKeyDown={onRenameKeyDown}
        />)
        :
        (<div className="sf-metadata-face-recognition-name form-control" onClick={renameName}>{name}</div>)
      }
      <table className="table-hover">
        <thead>
          <tr>
            {theadData.map((item, index) => {
              return <th key={index} width={item.width}>{item.text}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {group.photos.map((photo, index) => {
            return (
              <tr key={index} onClick={(event) => showPhoto(event, photo)}>
                <td className="text-center"><img src={photo.src} alt="" className="thumbnail cursor-pointer" /></td>
                <td><a href={`${siteRoot}lib/${repoID}/file${photo.path}`} onClick={(event) => showPhoto(event, photo)}>{photo.file_name}</a></td>
                <td>{photo.parent_dir}</td>
                <td>{Utils.bytesToSize(photo.size)}</td>
                <td title={dayjs(photo.mtime).fromNow()}>{dayjs(photo.mtime).fromNow()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

FaceGroup.propTypes = {
  repoID: PropTypes.string,
  group: PropTypes.object.isRequired,
  onPhotoClick: PropTypes.func,
};

export default FaceGroup;
