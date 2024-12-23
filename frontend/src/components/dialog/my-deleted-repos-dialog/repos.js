import React, { useState, useEffect, useRef } from 'react';
import RepoItem from './repo-item';
import { gettext, trashReposExpireDays } from '../../../utils/constants';

const Repos = ({ repos, filterRestoredRepo }) => {
  const [containerWidth, setContainerWidth] = useState(0);

  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const handleResize = () => {
      if (!container) return;
      setContainerWidth(container.offsetWidth);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    container && resizeObserver.observe(container);

    return () => {
      container && resizeObserver.unobserve(container);
    };
  }, []);

  return (
    <div ref={containerRef}>
      <p className="tip my-deleted-repos-tip">{gettext('Tip: libraries deleted {placeholder} days ago will be cleaned automatically.').replace('{placeholder}', trashReposExpireDays)}</p>
      <table>
        <thead>
          <tr>
            <th style={{ width: 40 }} className="pl-2 pr-2">{/* img*/}</th>
            <th style={{ width: (containerWidth - 40) * 0.5 }}>{gettext('Name')}</th>
            <th style={{ width: (containerWidth - 40) * 0.3 }}>{gettext('Deleted Time')}</th>
            <th style={{ width: (containerWidth - 40) * 0.2 }}></th>
          </tr>
        </thead>
        <tbody>
          {repos.map((repo) => {
            return (
              <RepoItem key={repo.repo_id} repo={repo} filterRestoredRepo={filterRestoredRepo} />
            );
          })}
        </tbody>
      </table>
    </div>
  );
};


export default Repos;
