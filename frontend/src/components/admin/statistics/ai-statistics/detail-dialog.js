import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal, ModalBody, ModalFooter } from 'reactstrap';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import DateTimePicker from '@/components/date-and-time-picker';
import { gettext } from '@/utils/constants';
import { Utils } from '@/utils/utils';
import EmptyTip from '../../../empty-tip';
import Loading from '../../../loading';
import SeahubModalHeader from '../../../seahub-modal-header';
import toaster from '../../../toast';

const propTypes = {
  condition: PropTypes.object,
  detailOptions: PropTypes.array,
  loadDetails: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  title: PropTypes.string,
};

const formatCredit = (value) => Number(value || 0).toFixed(2);

const formatCount = (value) => Number(value || 0).toLocaleString();

const getFirstDayOfCurrentMonth = () => dayjs().startOf('month').format('YYYY-MM-DD');

const AIStatisticsDetailDialog = ({ condition, detailOptions, loadDetails, onToggle, title }) => {
  const [groupBy, setGroupBy] = useState(detailOptions[0]?.value || 'date');
  const [startDate, setStartDate] = useState(getFirstDayOfCurrentMonth());
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [scenarios, setScenarios] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    setGroupBy(detailOptions[0]?.value || 'date');
    setStartDate(getFirstDayOfCurrentMonth());
    setEndDate(dayjs().format('YYYY-MM-DD'));
    setScenarios('');
  }, [detailOptions]);

  const fetchItems = () => {
    setLoading(true);
    setErrorMessage('');
    loadDetails(groupBy, startDate, endDate, condition, scenarios).then((res) => {
      setItems(Array.isArray(res.data.results) ? res.data.results : []);
      setLoading(false);
    }).catch((error) => {
      const errorMessage = Utils.getErrorMsg(error);
      toaster.danger(errorMessage);
      setErrorMessage(errorMessage);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, condition]);

  const columns = useMemo(() => {
    if (groupBy === 'date') {
      return [
        { key: 'date', name: gettext('Date') },
        { key: 'total_input_tokens', name: gettext('Input tokens') },
        { key: 'total_output_tokens', name: gettext('Output tokens') },
        { key: 'total_credit_used', name: gettext('Credit used') },
      ];
    }
    return [
      { key: 'repo_name', name: gettext('Library') },
      { key: 'repo_id', name: gettext('Library ID') },
      { key: 'total_input_tokens', name: gettext('Input tokens') },
      { key: 'total_output_tokens', name: gettext('Output tokens') },
      { key: 'total_credit_used', name: gettext('Credit used') },
    ];
  }, [groupBy]);

  const renderCell = (item, key) => {
    if (key === 'total_credit_used') {
      return formatCredit(item.total_credit_used);
    }
    if (key === 'total_input_tokens' || key === 'total_output_tokens') {
      return formatCount(item[key]);
    }
    return item[key] || '';
  };

  return (
    <Modal isOpen={true} toggle={onToggle} size="lg">
      <SeahubModalHeader toggle={onToggle}>{title || gettext('AI usage details')}</SeahubModalHeader>
      <ModalBody>
        <div className="d-flex align-items-center flex-wrap mb-4">
          <span className="mr-2">{gettext('Group by')}</span>
          <Input
            type="select"
            className="ai-statistics-detail-group-by mr-4"
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value)}
          >
            {detailOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Input>
          <span className="mr-2">{gettext('From')}</span>
          <div className="mr-4">
            <DateTimePicker
              showHourAndMinute={false}
              inputWidth={170}
              tabIndex={0}
              value={startDate ? dayjs(startDate) : null}
              disabledDate={() => false}
              onChange={(value) => setStartDate(value?.format('YYYY-MM-DD') || '')}
            />
          </div>
          <span className="mr-2">{gettext('To')}</span>
          <div className="mr-4">
            <DateTimePicker
              showHourAndMinute={false}
              inputWidth={170}
              tabIndex={0}
              value={endDate ? dayjs(endDate) : null}
              disabledDate={() => false}
              onChange={(value) => setEndDate(value?.format('YYYY-MM-DD') || '')}
            />
          </div>
        </div>
        <div className="d-flex align-items-center flex-wrap mb-4">
          <span className="mr-2">{gettext('Scenarios')}</span>
          <Input
            className="ai-statistics-detail-scenarios mr-4"
            value={scenarios}
            onChange={(event) => setScenarios(event.target.value)}
            placeholder="chat,summary"
          />
          <Button color="primary" onClick={fetchItems}>{gettext('Apply')}</Button>
        </div>
        {isLoading && <Loading />}
        {!isLoading && errorMessage && <p className="error text-center">{errorMessage}</p>}
        {!isLoading && !errorMessage && items.length === 0 && <EmptyTip text={gettext('No record')} />}
        {!isLoading && !errorMessage && items.length > 0 && (
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
                    <td key={column.key}>{renderCell(item, column.key)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={onToggle}>{gettext('Close')}</Button>
      </ModalFooter>
    </Modal>
  );
};

AIStatisticsDetailDialog.propTypes = propTypes;

export default AIStatisticsDetailDialog;
