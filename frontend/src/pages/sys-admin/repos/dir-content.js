import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import classnames from 'classnames';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import Loading from '../../../components/loading';

dayjs.extend(relativeTime);

class DirentItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isOpIconShown: false
    };
  }

  handleMouseOver = () => {
    this.setState({
      isHighlighted: true,
      isOpIconShown: true
    });
  };

  handleMouseOut = () => {
    this.setState({
      isHighlighted: false,
      isOpIconShown: false
    });
  };

  openFolder = () => {
    this.props.openFolder(this.props.dirent);
  };

  deleteDirent = () => {
    this.props.deleteDirent(this.props.dirent);
  };

  downloadDirent = () => {
    this.props.downloadDirent(this.props.dirent);
  };

  render() {
    let { isOpIconShown, isHighlighted } = this.state;
    let { dirent, fromSystemRepo } = this.props;
    let iconUrl = Utils.getDirentIcon(dirent);

    return (
      <Fragment>
        <tr
          className={classnames({
            'tr-highlight': isHighlighted
          })}
          onMouseEnter={this.handleMouseOver}
          onMouseLeave={this.handleMouseOut}
        >
          <td className="text-center"><img src={iconUrl} width="24" alt='' /></td>
          <td>
            {dirent.is_file ?
              dirent.name :
              <Link to="#" onClick={this.openFolder}>{dirent.name}</Link>
            }
          </td>
          <td>
            {isOpIconShown && fromSystemRepo &&
              <i
                className="op-icon sf3-font-delete1 sf3-font"
                title={gettext('Delete')}
                onClick={this.deleteDirent}
              >
              </i>
            }
            {isOpIconShown && dirent.is_file &&
            <i
              className="op-icon sf3-font sf3-font-download1"
              title={gettext('Download')}
              onClick={this.downloadDirent}
            >
            </i>
            }
          </td>
          <td>{dirent.size}</td>
          <td>{dayjs(dirent.mtime).fromNow()}</td>
        </tr>
      </Fragment>
    );
  }
}

DirentItem.propTypes = {
  dirent: PropTypes.object.isRequired,
  fromSystemRepo: PropTypes.bool.isRequired,
  deleteDirent: PropTypes.func.isRequired,
  openFolder: PropTypes.func.isRequired,
  downloadDirent: PropTypes.func.isRequired,
};

class DirContent extends React.Component {

  render() {
    let { loading, errorMsg, direntList } = this.props;

    if (loading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    }

    return (
      <Fragment>
        <table className="table-hover">
          <thead>
            <tr>
              <th width="5%">{/* icon*/}</th>
              <th width="55%">{gettext('Name')}</th>
              <th width="10%">{/* operation*/}</th>
              <th width="15%">{gettext('Size')}</th>
              <th width="15%">{gettext('Last Update')}</th>
            </tr>
          </thead>
          <tbody>
            {direntList.map((dirent, index) => {
              return <DirentItem
                key={index}
                dirent={dirent}
                openFolder={this.props.openFolder}
                deleteDirent={this.props.deleteDirent}
                downloadDirent={this.props.downloadDirent}
                fromSystemRepo={this.props.fromSystemRepo}
              />;
            })}
          </tbody>
        </table>
      </Fragment>
    );
  }
}

DirContent.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  openFolder: PropTypes.func.isRequired,
  direntList: PropTypes.array.isRequired,
  fromSystemRepo: PropTypes.bool.isRequired,
  deleteDirent: PropTypes.func.isRequired,
  downloadDirent: PropTypes.func.isRequired,
};

export default DirContent;
