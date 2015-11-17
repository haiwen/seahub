import logging

logger = logging.getLogger(__name__)

def write_xls(sheet_name, head, data_list):
    """write listed data into excel
    """

    try:
        import xlwt
    except ImportError as e:
        logger.error(e)
        return None

    wb = xlwt.Workbook(encoding='utf-8')
    ws = wb.add_sheet(sheet_name)

    # prepare table head
    head_style = xlwt.XFStyle()
    head_style.font.bold = True
    row_num = 0

    # write table head
    for col_num in xrange(len(head)):
        ws.write(row_num, col_num, head[col_num], head_style)

    # write table data
    for row in data_list:
        row_num += 1
        for col_num in xrange(len(row)):
            ws.write(row_num, col_num, row[col_num])

    return wb
