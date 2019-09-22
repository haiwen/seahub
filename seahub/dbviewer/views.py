import logging
import json

from django.http import HttpResponse
from django.views.decorators.http import require_GET

from seahub.auth.decorators import login_required_ajax, login_required

from utils import DBConnection, DBQuery

# Get an instance of a logger
logger = logging.getLogger(__name__)


@require_GET
@login_required
@login_required_ajax
def query_table(request, repo_id, path):
    connection = DBConnection(repo_id, path)
    query = DBQuery(connection.conn)
    tables = query.tables

    connection.close()
    return HttpResponse(json.dumps(tables))


@require_GET
@login_required
@login_required_ajax
def query_data(request, repo_id, path, table):
    connection = DBConnection(repo_id, path)
    query = DBQuery(connection.conn)

    cur_page = int(request.GET.get("page", 1))
    limit = int(request.GET.get("limit", 10))

    all_data = query.query_data(table, cur_page, limit)
    columns = query.columns
    data = [dict(zip(columns, d)) for d in all_data]
    count = query.count
    response_data = {
        "code": 0,  # Just 0 can display properly
        "data": data,
        "count": count,  # Total data, not total page
        "msg": "Success"
    }

    connection.close()
    return HttpResponse(json.dumps(response_data))


@require_GET
@login_required
@login_required_ajax
def getcolumns(request, repo_id, path, table):
    connection = DBConnection(repo_id, path)
    query = DBQuery(connection.conn)
    query.table = table

    tables = query.columns

    connection.close()
    return HttpResponse(json.dumps(tables))
