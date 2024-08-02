import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import toaster from '../components/toast';
import { Utils } from '../utils/utils';
import moment from 'moment';
import { gettext, siteRoot } from '../utils/constants';
import metadataAPI from '../metadata/api';

const theadData = [
  { width: '5%', text: '' },
  { width: '30%', text: gettext('Name') },
  { width: '20%', text: gettext('Original path') },
  { width: '12%', text: gettext('Last Update') },
  { width: '13%', text: gettext('Size') },
];

const PersonImage = ({ repoID }) => {
  const [faces, setFaces] = useState([]);

  useEffect(() => {
    metadataAPI.faceClassify(repoID).then(res => {
      const faces = res.data.classify_result || {};
      setFaces(faces);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderItem = useCallback((items) => {
    return (
      <table className="table-hover">
        <thead>
          <tr>
            {theadData.map((item, index) => {
              return <th key={index} width={item.width}>{item.text}</th>;
            })}
          </tr>
        </thead>
        <tbody>{
          items.map((item, index) => {
            return (
              <tr key={index}>
                <td className="text-center"><img src={Utils.getFileIconUrl(item.file_name)} alt={gettext('File')} width="24" /></td>
                <td><a href={`${siteRoot}lib/${repoID}/file${item.path}`} target="_blank" rel="noreferrer">{item.file_name}</a></td>
                <td>{item.parent_dir}</td>
                <td title={moment(item.mtime).format('LLLL')}>{moment(item.mtime).format('YYYY-MM-DD')}</td>
                <td>{Utils.bytesToSize(item.size)}</td>
              </tr>
            );
          })
        }
        </tbody>
      </table>
    );
  }, [repoID]);

  return (
    <>
      {
        faces.length > 0 && faces.map((item, index) => {
          const text = gettext('Person Image') + ` ${index + 1}`;
          return (
            <div key={index}>
              <h4>{text}</h4>
              {renderItem(item)}
            </div>
          );
        })
      }
    </>
  );
};

PersonImage.propTypes = {
  repoID: PropTypes.string.isRequired,
};

export default PersonImage;
