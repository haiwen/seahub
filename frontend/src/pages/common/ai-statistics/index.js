import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Button, Input } from 'reactstrap';

import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';

import AIStatisticsDetailDialog from './detail-dialog';

const propTypes = {
  defaultGroupBy: PropTypes.string.isRequired,
  detailOptionsMap: PropTypes.object.isRequired,
  enableOverview: PropTypes.bool,
  listFetcher: PropTypes.func.isRequired,
  detailFetcher: PropTypes.func.isRequired,
  overviewFetcher: PropTypes.func,
  showOrgColumn: PropTypes.bool,
  tabs: PropTypes.array.isRequired,
};

const formatCredit = (value) => Number(value || 0).toFixed(2);

const getSearchParamNumber = (name, defaultValue) => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  const value = parseInt(new URL(window.location.href).searchParams.get(name) || `${defaultValue}`, 10);
  return Number.isNaN(value) ? defaultValue : value;
};

const buildCondition = (groupBy, item) => {
  const condition = {};
  if (item.org_id !== null && item.org_id !== undefined) {
    condition.org_id = item.org_id;
  }

  if (groupBy === 'repo') {
    condition.repo_id = item.repo_id;
    return condition;
  }
  if (groupBy === 'user') {
    condition.username = item.username;
    return condition;
  }
  if (groupBy === 'group') {
    condition.group_id = item.group_id;
    return condition;
  }
  if (groupBy === 'org') {
    condition.org_id = item.org_id;
    return condition;
  }
  return condition;
};

const getDefaultPage = () => {
  return getSearchParamNumber('page', 1);
};

const getDefaultPerPage = () => {
  return getSearchParamNumber('per_page', 25);
};

const renderUserText = (name, username) => {
  if (name && username && name !== username) {
    return `${name} (${username})`;
  }
  return name || username || '';
};

const AIStatisticsPage = ({
  defaultGroupBy,
  detailOptionsMap,
  enableOverview = false,
  listFetcher,
  detailFetcher,
  overviewFetcher,
  showOrgColumn = false,
  tabs,
}) => {
  const [groupBy, setGroupBy] = useState(defaultGroupBy);
  const [queryMode, setQueryMode] = useState('date');
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const [currentPage, setCurrentPage] = useState(getDefaultPage);
  const [perPage, setPerPage] = useState(getDefaultPerPage);
  const [isLoading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [items, setItems] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [detailConfig, setDetailConfig] = useState(null);
  const [overviewData, setOverviewData] = useState({
    summary: null,
    scenario: [],
    month: [],
    date: [],
  });

  useEffect(() => {
    if (enableOverview && groupBy === 'overview') {
      setLoading(true);
      setErrorMessage('');
      Promise.all([
        overviewFetcher(),
        overviewFetcher('scenario'),
        overviewFetcher('month'),
        overviewFetcher('date'),
      ]).then(([summaryRes, scenarioRes, monthRes, dateRes]) => {
        setOverviewData({
          summary: summaryRes.data,
          scenario: scenarioRes.data.results || [],
          month: monthRes.data.results || [],
          date: dateRes.data.results || [],
        });
        setLoading(false);
      }).catch((error) => {
        const errorMessage = Utils.getErrorMsg(error);
        toaster.danger(errorMessage);
        setErrorMessage(errorMessage);
        setLoading(false);
      });
      return;
    }

    setLoading(true);
    setErrorMessage('');
    const dateParam = queryMode === 'date' ? date : null;
    const monthParam = queryMode === 'month' ? month.replace('-', '') : null;
    listFetcher(dateParam, monthParam, groupBy, currentPage, perPage).then((res) => {
      const results = Array.isArray(res.data.results) ? res.data.results : [];
      const count = Number(res.data.count || 0);
      setItems(results);
      setHasNextPage(Utils.hasNextPage(currentPage, perPage, count));
      setLoading(false);
    }).catch((error) => {
      const errorMessage = Utils.getErrorMsg(error);
      toaster.danger(errorMessage);
      setErrorMessage(errorMessage);
      setLoading(false);
    });
  }, [currentPage, date, enableOverview, groupBy, listFetcher, month, overviewFetcher, perPage, queryMode]);

  const columns = useMemo(() => {
    if (groupBy === 'repo') {
      const nextColumns = [
        { key: 'repo_name', name: gettext('Library') },
        { key: 'repo_id', name: gettext('Library ID') },
        { key: 'owner_display', name: gettext('Owner') },
      ];
      if (showOrgColumn) {
        nextColumns.push({ key: 'org_display', name: gettext('Team') });
      }
      nextColumns.push({ key: 'total_credit_used', name: gettext('Credit used') });
      nextColumns.push({ key: 'actions', name: gettext('Details') });
      return nextColumns;
    }
    if (groupBy === 'user') {
      const nextColumns = [
        { key: 'username_display', name: gettext('User') },
      ];
      if (showOrgColumn) {
        nextColumns.push({ key: 'org_display', name: gettext('Team') });
      }
      nextColumns.push({ key: 'total_credit_used', name: gettext('Credit used') });
      nextColumns.push({ key: 'actions', name: gettext('Details') });
      return nextColumns;
    }
    if (groupBy === 'group') {
      const nextColumns = [
        { key: 'group_display', name: gettext('Group') },
        { key: 'creator_display', name: gettext('Creator') },
      ];
      if (showOrgColumn) {
        nextColumns.push({ key: 'org_display', name: gettext('Team') });
      }
      nextColumns.push({ key: 'total_credit_used', name: gettext('Credit used') });
      nextColumns.push({ key: 'actions', name: gettext('Details') });
      return nextColumns;
    }
    if (groupBy === 'org') {
      return [
        { key: 'org_display', name: gettext('Team') },
        { key: 'creator_display', name: gettext('Creator') },
        { key: 'total_credit_used', name: gettext('Credit used') },
        { key: 'actions', name: gettext('Details') },
      ];
    }
    return [];
  }, [groupBy, showOrgColumn]);

  const openDetails = (item) => {
    setDetailConfig({
      condition: buildCondition(groupBy, item),
      detailOptions: detailOptionsMap[groupBy] || [],
      title: gettext('AI usage details'),
    });
  };

  const renderCell = (item, key) => {
    if (key === 'owner_display') {
      if (item.group_name) {
        return item.group_name;
      }
      return renderUserText(item.nickname, item.repo_owner);
    }
    if (key === 'org_display') {
      return item.org_name || (item.org_id ? `${gettext('Team')} #${item.org_id}` : '');
    }
    if (key === 'username_display') {
      return renderUserText(item.nickname, item.username);
    }
    if (key === 'group_display') {
      return item.group_name || item.group_id || '';
    }
    if (key === 'creator_display') {
      return renderUserText(item.creator_name, item.creator);
    }
    if (key === 'total_credit_used') {
      return formatCredit(item.total_credit_used);
    }
    if (key === 'actions') {
      return (
        <Button color="link" className="p-0" onClick={() => openDetails(item)}>
          {gettext('View')}
        </Button>
      );
    }
    return item[key] || '';
  };

  const renderOverviewTable = (title, titleKey, valueKey, data) => (
    <div className="border rounded p-3 h-100">
      <h5 className="mb-3">{title}</h5>
      {data.length === 0 && <EmptyTip text={gettext('No record')} />}
      {data.length > 0 && (
        <table className="w-100">
          <thead>
            <tr>
              <th>{titleKey}</th>
              <th>{gettext('Credit used')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={`${title}-${index}`}>
                <td>{item[valueKey]}</td>
                <td>{formatCredit(item.total_credit_used)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <>
      <div className="d-flex align-items-center flex-wrap mb-4">
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            color={groupBy === tab.value ? 'primary' : 'secondary'}
            className="mr-2 mb-2"
            onClick={() => {
              setGroupBy(tab.value);
              setCurrentPage(1);
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      {groupBy !== 'overview' && (
        <div className="d-flex align-items-center flex-wrap mb-4">
          <Button
            color={queryMode === 'date' ? 'primary' : 'secondary'}
            className="mr-2"
            onClick={() => {
              setQueryMode('date');
              setCurrentPage(1);
            }}
          >
            {gettext('By date')}
          </Button>
          <Button
            color={queryMode === 'month' ? 'primary' : 'secondary'}
            className="mr-4"
            onClick={() => {
              setQueryMode('month');
              setCurrentPage(1);
            }}
          >
            {gettext('By month')}
          </Button>
          {queryMode === 'date' && (
            <>
              <span className="mr-2">{gettext('Date')}</span>
              <Input
                type="date"
                style={{ width: '180px' }}
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </>
          )}
          {queryMode === 'month' && (
            <>
              <span className="mr-2">{gettext('Month')}</span>
              <Input
                type="month"
                style={{ width: '180px' }}
                value={month}
                onChange={(event) => {
                  setMonth(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </>
          )}
        </div>
      )}
      {isLoading && <Loading />}
      {!isLoading && errorMessage && <p className="error text-center">{errorMessage}</p>}
      {!isLoading && !errorMessage && enableOverview && groupBy === 'overview' && overviewData.summary && (
        <>
          <div className="row mb-4">
            <div className="col-md-3 mb-3">
              <div className="border rounded p-3 h-100">
                <div className="text-secondary mb-2">{gettext('Current month')}</div>
                <div className="h4 mb-0">{formatCredit(overviewData.summary.current_month_credit)}</div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="border rounded p-3 h-100">
                <div className="text-secondary mb-2">{gettext('Last month')}</div>
                <div className="h4 mb-0">{formatCredit(overviewData.summary.last_month_credit)}</div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="border rounded p-3 h-100">
                <div className="text-secondary mb-2">{gettext('Last month same day')}</div>
                <div className="h4 mb-0">{formatCredit(overviewData.summary.last_month_same_day_credit)}</div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="border rounded p-3 h-100">
                <div className="text-secondary mb-2">{gettext('Month on month change')}</div>
                <div className="h4 mb-0">{formatCredit(overviewData.summary.month_on_month_change)}</div>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-4 mb-4">
              {renderOverviewTable(gettext('By scenario'), gettext('Scenario'), 'scenario', overviewData.scenario)}
            </div>
            <div className="col-lg-4 mb-4">
              {renderOverviewTable(gettext('By month'), gettext('Month'), 'month', overviewData.month)}
            </div>
            <div className="col-lg-4 mb-4">
              {renderOverviewTable(gettext('By day'), gettext('Date'), 'date', overviewData.date)}
            </div>
          </div>
        </>
      )}
      {!isLoading && !errorMessage && (!enableOverview || groupBy !== 'overview') && items.length === 0 && (
        <EmptyTip text={gettext('No record')} />
      )}
      {!isLoading && !errorMessage && (!enableOverview || groupBy !== 'overview') && items.length > 0 && (
        <>
          <table className="w-100">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${groupBy}-${index}`}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {renderCell(item, column.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <Paginator
            gotoPreviousPage={() => setCurrentPage(currentPage - 1)}
            gotoNextPage={() => setCurrentPage(currentPage + 1)}
            currentPage={currentPage}
            hasNextPage={hasNextPage}
            curPerPage={perPage}
            resetPerPage={(nextPerPage) => {
              setPerPage(nextPerPage);
              setCurrentPage(1);
            }}
          />
        </>
      )}
      {detailConfig && (
        <AIStatisticsDetailDialog
          condition={detailConfig.condition}
          detailOptions={detailConfig.detailOptions}
          loadDetails={detailFetcher}
          onToggle={() => setDetailConfig(null)}
          title={detailConfig.title}
        />
      )}
    </>
  );
};

AIStatisticsPage.propTypes = propTypes;

export default AIStatisticsPage;
