import React from 'react';
import { createRoot } from 'react-dom/client';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from '../../utils/constants';
import { systemAdminAPI } from '../../utils/system-admin-api';
import Loading from '../../components/loading';
import Icon from '../../components/icon';
import CommonToolbar from '../../components/toolbar/common-toolbar';

import '../../css/repo-snapshot.css';

const {
  repoID, repoName,
  commitID, commitTime, commitDesc, commitRelativeTime,
  showAuthor, authorAvatarURL, authorName, authorNickName
} = window.app.pageOptions;

class RepoSnapshot extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      folderPath: '/',
      folderItems: [],
    };
  }

  componentDidMount() {
    this.renderFolder(this.state.folderPath);
  }

  goBack = (e) => {
    e.preventDefault();
    window.history.back();
  };

  renderFolder = (folderPath) => {
    this.setState({
      folderPath: folderPath,
      folderItems: [],
      isLoading: true
    });

    systemAdminAPI.sysAdminListCommitDir(repoID, commitID, folderPath).then((res) => {
      this.setState({
        isLoading: false,
        folderItems: res.data.dirent_list
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  clickFolderPath = (folderPath, e) => {
    e.preventDefault();
    this.renderFolder(folderPath);
  };

  renderPath = () => {
    const path = this.state.folderPath;
    const pathList = path.split('/');

    if (path == '/') {
      return <span className="text-truncate" title={repoName}>{repoName}</span>;
    }

    return (
      <React.Fragment>
        <a href="#" onClick={this.clickFolderPath.bind(this, '/')} className="text-truncate" title={repoName}>{repoName}</a>
        <span className="mx-1">/</span>
        {pathList.map((item, index) => {
          if (index > 0 && index != pathList.length - 1) {
            return (
              <React.Fragment key={index}>
                <a href="#" onClick={this.clickFolderPath.bind(this, pathList.slice(0, index + 1).join('/'))} className="text-truncate" title={pathList[index]}>{pathList[index]}</a>
                <span className="mx-1">/</span>
              </React.Fragment>
            );
          }
          return null;
        }
        )}
        <span className="text-truncate" title={pathList[pathList.length - 1]}>{pathList[pathList.length - 1]}</span>
      </React.Fragment>
    );
  };

  render() {
    const { folderPath } = this.state;

    let title = gettext('{placeholder} Snapshot');
    title = title.replace('{placeholder}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(repoName) + '</span>');
    return (
      <React.Fragment>
        <div className="h-100 d-flex flex-column">
          <div className="top-header d-flex justify-content-between">
            <a href={siteRoot}>
              <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
            </a>
            <CommonToolbar isShowSearch={false} isShowNotice={false} />
          </div>
          <div className="flex-auto container-fluid pt-4 pb-6 o-auto">
            <div className="row">
              <div className="col-md-10 offset-md-1">
                <h2>
                  <span dangerouslySetInnerHTML={{ __html: title }} className="d-flex mw-100"></span>
                  <span className="heading-commit-time ml-1">({commitTime})</span>
                </h2>
                <a href="#" className="go-back" title={gettext('Back')} role="button" aria-label={gettext('Back')} onClick={this.goBack}>
                  <Icon symbol="down" className="rotate-90" />
                </a>
                {folderPath == '/' && (
                  <div className="d-flex mb-2 align-items-center">
                    <p className="m-0 text-truncate" title={commitDesc}>{commitDesc}</p>
                    <div className="ml-4 border-start pl-4 d-flex align-items-center flex-shrink-0">
                      {showAuthor ? (
                        <React.Fragment>
                          <img src={authorAvatarURL} width="20" height="20" alt="" className="rounded mr-1" />
                          <a href={`${siteRoot}sys/users/${encodeURIComponent(authorName)}/`}>{authorNickName}</a>
                        </React.Fragment>
                      ) : <span>{gettext('Unknown')}</span>}
                      <p className="m-0 ml-2" dangerouslySetInnerHTML={{ __html: commitRelativeTime }}></p>
                    </div>
                  </div>
                )}
                <div className="d-flex justify-content-between align-items-center op-bar">
                  <p className="m-0 text-truncate d-flex"><span className="mr-1">{gettext('Current path: ')}</span>{this.renderPath()}</p>
                </div>
                <Content
                  data={this.state}
                  renderFolder={this.renderFolder}
                />
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

class Content extends React.Component {

  constructor(props) {
    super(props);
    this.theadData = [
      { width: '5%', text: '' },
      { width: '55%', text: gettext('Name') },
      { width: '20%', text: gettext('Size') },
      { width: '20%', text: '' }
    ];
  }

  render() {
    const { isLoading, errorMsg, folderPath, folderItems } = this.props.data;

    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <p className="error mt-6 text-center">{errorMsg}</p>;
    }

    return (
      <table className="table-hover">
        <thead>
          <tr>
            {this.theadData.map((item, index) => {
              return <th key={index} width={item.width}>{item.text}</th>;
            })}
          </tr>
        </thead>
        <tbody>
          {folderItems.map((item, index) => {
            return <FolderItem
              key={index}
              item={item}
              folderPath={folderPath}
              renderFolder={this.props.renderFolder}
            />;
          })
          }
        </tbody>
      </table>
    );
  }
}

Content.propTypes = {
  data: PropTypes.object.isRequired,
  renderFolder: PropTypes.func.isRequired,
};

class FolderItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isIconShown: false
    };
  }

  handleMouseOver = () => {
    this.setState({
      isHighlighted: true,
      isIconShown: true
    });
  };

  handleMouseOut = () => {
    this.setState({
      isHighlighted: false,
      isIconShown: false
    });
  };

  renderFolder = (e) => {
    e.preventDefault();

    const item = this.props.item;
    const { folderPath } = this.props;
    this.props.renderFolder(Utils.joinPath(folderPath, item.name));
  };

  render() {
    const item = this.props.item;
    const { isIconShown, isHighlighted } = this.state;
    const { folderPath } = this.props;

    return item.type == 'dir' ? (
      <tr
        className={classnames({
          'tr-highlight': isHighlighted
        })}
        onMouseOver={this.handleMouseOver}
        onMouseOut={this.handleMouseOut}
        onFocus={this.handleMouseOver}
      >
        <td className="text-center"><img src={Utils.getFolderIconUrl()} alt={gettext('Folder')} width="24" /></td>
        <td><a href="#" onClick={this.renderFolder}>{item.name}</a></td>
        <td></td>
        <td></td>
      </tr>
    ) : (
      <tr
        className={classnames({
          'tr-highlight': isHighlighted
        })}
        onMouseOver={this.handleMouseOver}
        onMouseOut={this.handleMouseOut}
        onFocus={this.handleMouseOver}
      >
        <td className="text-center"><img src={Utils.getFileIconUrl(item.name)} alt={gettext('File')} width="24" /></td>
        <td>{item.name}</td>
        <td>{Utils.bytesToSize(item.size)}</td>
        <td>
          <div className="d-flex align-items-center">
            <a href={`${siteRoot}sys/libraries/${repoID}/history/snapshot/download-file/?obj_id=${item.obj_id}&file_path=${encodeURIComponent(Utils.joinPath(folderPath, item.name))}`} className={`op-icon ${isIconShown ? '' : 'invisible'}`} title={gettext('Download')} role="button" aria-label={gettext('Download')}>
              <Icon symbol="download" />
            </a>
          </div>
        </td>
      </tr>
    );
  }
}

FolderItem.propTypes = {
  item: PropTypes.object.isRequired,
  folderPath: PropTypes.string.isRequired,
  renderFolder: PropTypes.func.isRequired,
};

const root = createRoot(document.getElementById('wrapper'));
root.render(<RepoSnapshot />);
