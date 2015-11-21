import logging

logger = logging.getLogger(__name__)

def write_xls(sheet_name, head, data_list):
    """write listed data into excel
    """

    try:
        import openpyxl
    except ImportError as e:
        logger.error(e)
        return None

    wb = openpyxl.Workbook()
    ws = wb.get_active_sheet()
    ws.title = sheet_name

    row_num = 0

    # write table head
    for col_num in xrange(len(head)):
        c = ws.cell(row = row_num + 1, column = col_num + 1)
        c.value = head[col_num]

    # write table data
    for row in data_list:
        row_num += 1
        for col_num in xrange(len(row)):
            c = ws.cell(row = row_num + 1, column = col_num + 1)
            c.value = row[col_num]

    return wb
