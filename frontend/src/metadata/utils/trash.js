export const prepareTrashRows = (initialRows) => {
  return initialRows.map(item => ({
    _id: crypto.randomUUID(),
    _parent_dir: item.parent_dir,
    _name: item.obj_name,
    _obj_id: item.obj_id,
    _size: item.size,
    _file_ctime: item.deleted_time,
    _is_dir: item.is_dir,
    ...item,
  }));
};

export const getTrashColumns = () => {
  return [
    {
      'key': '_file_ctime',
      'name': '_file_ctime',
      'type': 'date',
      'data': null
    },
    {
      'key': '_parent_dir',
      'name': '_parent_dir',
      'type': 'text',
      'data': null
    },
    {
      'key': '_name',
      'name': '_name',
      'type': 'text',
      'data': null
    },
    {
      'key': '_obj_id',
      'name': '_obj_id',
      'type': 'text',
      'data': null
    },
    {
      'key': '_size',
      'name': '_size',
      'type': 'number',
      'data': null
    },
    {
      'key': '_is_dir',
      'name': '_is_dir',
      'type': 'checkbox',
      'data': null
    },
  ];
};

export const TRASH_PER_PAGE = 100;
