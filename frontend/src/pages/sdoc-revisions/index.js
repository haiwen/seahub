import React, { Component, Fragment } from 'react';
import ReactDom from 'react-dom';
import moment from 'moment';
import classnames from 'classnames';
import { siteRoot, mediaUrl, logoPath, siteTitle, logoHeight, logoWidth, gettext } from '../../utils/constants';
import '../../css/sdoc-revisions.css';

moment.locale(window.app.config.lang);
const { filename, zipped, forloopLast, repo, viewLibFile, revisions, currentPage, prevPage,
  nextPage, perPage, pageNext, extraHref } = window.sdocRevisions;
const validZipped = JSON.parse(zipped);
const validRevisions = JSON.parse(revisions);

class SdocRevisions extends Component {

  renderPerPage = (perPageCount, className) => {
    if (perPage === perPageCount) {
      return (<span className={classnames('', className)}>{perPageCount}</span>);
    }
    return (
      <a href={`?per_page=${perPageCount}${extraHref}`} className={classnames('per-page', className)}>{perPageCount}</a>
    );
  }

  renderRevisions = () => {
    if (!Array.isArray(validRevisions) || validRevisions.length === 0) {
      return (
        <div className="empty-tips">
          <h2 className="alc">{gettext('This file has not revisions yet')}</h2>
        </div>
      );
    }
    return (
      <table className="file-audit-list">
        <thead>
          <tr>
            <th width="25%" className="user">{gettext('User')}</th>
            <th width="50%">{gettext('File_name')}</th>
            <th width="25%">{gettext('Ctime')}</th>
          </tr>
        </thead>
        <tbody>
          {validRevisions.map(revision => {
            return (
              <tr key={revision.doc_uuid} className="sdoc-revision">
                <td width="25%" className="user">{revision.nickname}</td>
                <td width="50%">
                  <a href={`${siteRoot}lib/${repo['id']}/file${revision.file_path}`}>
                    {revision.filename}
                  </a>
                </td>
                <td width="25%">{moment(revision.created_at).format('YYYY-MM-DD HH:MM')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  renderFooter = () => {
    return (
      <div id="paginator">
        {currentPage !== 1 && (
          <a href={`?page=${prevPage}&per_page=${perPage}${extraHref}`} className="mr-1">{gettext('Previous')}</a>
        )}
        {pageNext && (
          <a href={`?page=${nextPage}&per_page=${perPage}${extraHref}`} className="mr-1">{gettext('Next')}</a>
        )}
        {(currentPage !== 1 || pageNext) && (<span className="mr-1">{'|'}</span>)}
        <span className="mr-1">{gettext('Per page: ')}</span>
        {this.renderPerPage(25, 'mr-1')}
        {this.renderPerPage(50, 'mr-1')}
        {this.renderPerPage(100)}
      </div>
    );
  }

  render() {
    return (
      <>
        <div id="header" className="d-flex">
          <a href={siteRoot} id="logo">
            <img src={`${mediaUrl}${logoPath}`} title={siteTitle} alt="logo" width={logoWidth} height={logoHeight} />
          </a>
        </div>
        <div id="main" className="container-fluid w100 flex-auto ov-auto sdoc-revisions">
          <div id="wide-panel-noframe" className="row">
            <div className="col-md-10 col-md-offset-1">
              <h2 className="file-access-hd">
                <span className="op-target mr-1">{filename}</span>
                {gettext('Revisions')}
              </h2>
              <div className="file-audit-list-topbar">
                <p className="path">
                  <span className="mr-1">{gettext('Current Path:')}</span>
                  {validZipped.map((item, index) => {
                    if (forloopLast) {
                      return (<a key={index} href={`${viewLibFile.slice(0, -1)}${item[1]}`} target="_blank" rel="noreferrer">{item[0]}</a>);
                    }
                    return (
                      <Fragment key={index}>
                        <a href={`${viewLibFile.slice(0, -1)}${item[1]}`} target="_blank" rel="noreferrer">{item[0]}</a>
                        {index !== validZipped.length - 1 && (
                          <span className="mr-1 ml-1">{'/'}</span>
                        )}
                      </Fragment>
                    );
                  })}
                </p>
              </div>
              {this.renderRevisions()}
              {this.renderFooter()}
            </div>
          </div>
        </div>
      </>
    );
  }
}

ReactDom.render(<SdocRevisions />, document.getElementById('wrapper'));
