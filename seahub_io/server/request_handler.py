import jwt
import logging
import json
import datetime

from flask import Flask, request, make_response
from seahub_io.app.config import SEAHUB_SECRET_KEY
from seahub_io.server.task_manager import task_manager
from seahub_io.server.export_task_manager import event_export_task_manager
from seahub_io.server.import_task_manager import event_import_task_manager
from seahub_io.server.repo_archive_task_manager import repo_archive_task_manager
from seahub_io.seasearch.index_task.index_task_manager import index_task_manager
from seahub_io.repo_metadata.metadata_server_api import MetadataServerAPI
from seahub_io.repo_metadata.utils import add_file_details
from seahub_io.app.cache_provider import cache
from seahub_io.app.event_redis import redis_cache, REDIS_METRIC_KEY
from seahub_io.face_recognition.utils import recognize_faces_by_obj_ids


app = Flask(__name__)
logger = logging.getLogger(__name__)


def check_auth_token(req):
    auth = req.headers.get('Authorization', '').split()
    if not auth or auth[0].lower() != 'token' or len(auth) != 2:
        return False, 'Token invalid.'

    token = auth[1]
    if not token:
        return False, 'Token invalid.'

    private_key = SEAHUB_SECRET_KEY
    try:
        jwt.decode(token, private_key, algorithms=['HS256'])
    except (jwt.ExpiredSignatureError, jwt.InvalidSignatureError) as e:
        return False, e

    return True, None


@app.route('/add-init-metadata-task', methods=['GET'])
def add_init_metadata_task():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return make_response((error, 403))

    if task_manager.tasks_queue.full():
        logger.warning('seahub_io server busy, queue size: %d' % (task_manager.tasks_queue.qsize(), ))
        return make_response(('seahub_io server busy.', 400))

    username = request.args.get('username')
    repo_id = request.args.get('repo_id')

    try:
        task_id = task_manager.add_init_metadata_task(
            username, repo_id)
    except Exception as e:
        logger.error(e)
        return make_response((e, 500))

    return make_response(({'task_id': task_id}, 200))


@app.route('/add-export-log-task', methods=['GET'])
def get_sys_logs_task():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return make_response((error, 403))

    if event_export_task_manager.tasks_queue.full():
        logger.warning('seahub_io server busy, queue size: %d, current tasks: %s, threads is_alive: %s'
                                 % (event_export_task_manager.tasks_queue.qsize(), event_export_task_manager.current_task_info,
                                    event_export_task_manager.threads_is_alive()))
        return make_response(('seahub_io server busy,.', 400))

    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')
    log_type = request.args.get('log_type')
    try:
        task_id = event_export_task_manager.add_export_logs_task(start_time, end_time, log_type)
    except Exception as e:
        logger.error(e)
        return make_response((e, 500))

    return make_response(({'task_id': task_id}, 200))


@app.route('/add-org-export-log-task', methods=['GET'])
def get_org_logs_task():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return make_response((error, 403))

    if event_export_task_manager.tasks_queue.full():
        logger.warning('seahub_io server busy, queue size: %d, current tasks: %s, threads is_alive: %s'
                                 % (event_export_task_manager.tasks_queue.qsize(), event_export_task_manager.current_task_info,
                                    event_export_task_manager.threads_is_alive()))
        return make_response(('seahub_io server busy,.', 400))

    start_time = request.args.get('start_time')
    end_time = request.args.get('end_time')
    log_type = request.args.get('log_type')
    org_id = request.args.get('org_id')
    try:
        task_id = event_export_task_manager.add_org_export_logs_task(start_time, end_time, log_type, org_id)
    except Exception as e:
        logger.error(e)
        return make_response((e, 500))

    return make_response(({'task_id': task_id}, 200))


@app.route('/query-export-status', methods=['GET'])
def query_status():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return make_response((error, 403))

    task_id = request.args.get('task_id')
    if not event_export_task_manager.is_valid_task_id(task_id):
        return make_response(('task_id not found.', 404))

    try:
        is_finished, error = event_export_task_manager.query_status(task_id)
    except Exception as e:
        logger.debug(e)
        return make_response((e, 500))

    if error:
        return make_response((error, 500))
    return make_response(({'is_finished': is_finished}, 200))


@app.route('/query-import-status', methods=['GET'])
def query_import_status():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return make_response((error, 403))
    task_id = request.args.get('task_id')
    if not event_import_task_manager.is_valid_task_id(task_id):
        return make_response(('task_id not found.', 404))

    try:
        is_finished, error = event_import_task_manager.query_status(task_id)
    except Exception as e:
        logger.debug(e)
        return make_response((e, 500))

    if error:
        return make_response((error, 500))
    return make_response(({'is_finished': is_finished}, 200))


@app.route('/search', methods=['POST'])
def search():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return {'error_msg': str(error)}, 403

    # Check seasearch is enable
    if not index_task_manager.enabled:
        return {'error_msg': 'Seasearch is not enabled by seafevents.conf'}
    try:
        data = json.loads(request.data)
    except Exception as e:
        logger.exception(e)
        return {'error_msg': 'Bad request.'}, 400

    query = data.get('query')
    query = query.strip() if query else None
    repos = data.get('repos')
    suffixes = data.get('suffixes')
    search_path = data.get('search_path')
    obj_type = data.get('obj_type')
    time_range = data.get('time_range')
    size_range = data.get('size_range')
    search_filename_only = data.get('search_filename_only')

    if not repos:
        return {'error_msg': 'repos invalid.'}, 400

    try:
        count = int(data.get('count'))
    except:
        count = 20

    results = index_task_manager.file_search(query, repos, count, suffixes, search_path, obj_type, time_range, size_range, search_filename_only)

    return {'results': results}, 200


@app.route('/add-init-face-recognition-task', methods=['GET'])
def add_init_face_recognition_task():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return make_response((error, 403))

    if task_manager.tasks_queue.full():
        logger.warning('seahub_io server busy, queue size: %d' % (task_manager.tasks_queue.qsize(),))
        return make_response(('seahub_io server busy.', 400))

    username = request.args.get('username')
    repo_id = request.args.get('repo_id')

    try:
        task_id = task_manager.add_init_face_recognition_task(
            username, repo_id)
    except Exception as e:
        logger.error(e)
        return make_response((e, 500))

    return make_response(({'task_id': task_id}, 200))


@app.route('/recognize-faces', methods=['POST'])
def recognize_faces():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return {'error_msg': str(error)}, 403

    try:
        data = json.loads(request.data)
    except Exception as e:
        logger.exception(e)
        return {'error_msg': 'Bad request.'}, 400

    obj_ids = data.get('obj_ids')
    repo_id = data.get('repo_id')

    if not obj_ids or not isinstance(obj_ids, list):
        return {'error_msg': 'obj_ids invalid.'}, 400
    if not repo_id:
        return {'error_msg': 'repo_id invalid.'}, 400

    try:
        recognize_faces_by_obj_ids(repo_id, obj_ids)
    except Exception as e:
        logger.error(e)
        return {'error_msg': 'Internal Server Error'}, 500

    return {'success': True}, 200


@app.route('/extract-file-details', methods=['POST'])
def extract_file_details():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return {'error_msg': str(error)}, 403

    try:
        data = json.loads(request.data)
    except Exception as e:
        logger.exception(e)
        return {'error_msg': 'Bad request.'}, 400

    obj_ids = data.get('obj_ids')
    repo_id = data.get('repo_id')

    if not obj_ids or not isinstance(obj_ids, list):
        return {'error_msg': 'obj_ids invalid.'}, 400
    if not repo_id:
        return {'error_msg': 'repo_id invalid.'}, 400

    metadata_server_api = MetadataServerAPI('seahub_io')
    details = add_file_details(repo_id, obj_ids, metadata_server_api)

    return {'details': details}, 200


@app.route('/search-wikis', methods=['POST'])
def search_wikis():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return {'error_msg': str(error)}, 403

    # Check seasearch is enable
    if not index_task_manager.enabled:
        return {'error_msg': 'Seasearch is not enabled by seafevents.conf'}
    try:
        data = json.loads(request.data)
    except Exception as e:
        logger.exception(e)
        return {'error_msg': 'Bad request.'}, 400

    query = data.get('query', '').strip()
    wiki_ids = data.get('wiki_ids')

    if not query:
        return {'error_msg': 'query invalid.'}, 400
    if not wiki_ids:
        return {'error_msg': 'wiki_ids invalid.'}, 400

    # Normalize to list format (supports single wiki_id string or list)
    if isinstance(wiki_ids, str):
        wiki_ids = [wiki_ids]

    if not isinstance(wiki_ids, list):
        return {'error_msg': 'wiki_ids invalid.'}, 400

    try:
        count = int(data.get('count'))
    except:
        count = 20

    results, total = index_task_manager.search_wikis(query, wiki_ids, count)

    return {'results': results, 'total': total}, 200


@app.route('/add-convert-wiki-task', methods=['GET'])
def add_convert_wiki_task():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return {'error_msg': str(error)}, 403

    new_repo_id = request.args.get('new_repo_id')
    old_repo_id = request.args.get('old_repo_id')
    username = request.args.get('username')

    if not new_repo_id:
        return {'error_msg': 'new_repo_id invalid.'}, 400

    if not old_repo_id:
        return {'error_msg': 'old_repo_id invalid.'}, 400

    if not username:
        return {'error_msg': 'username invalid.'}, 400

    try:
        task_id = event_export_task_manager.add_convert_wiki_task(old_repo_id, new_repo_id, username)
    except Exception as e:
        logger.error(e)
        return make_response((e, 500))

    return {'task_id': task_id}, 200


@app.route('/update-people-cover-photo', methods=['POST'])
def update_cover_photo():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return make_response((error, 403))

    try:
        data = json.loads(request.data)
    except Exception as e:
        logger.exception(e)
        return {'error_msg': 'Bad request.'}, 400

    repo_id = data.get('repo_id')
    path = data.get('path')
    people_id = data.get('people_id')
    download_token = data.get('download_token')

    if not repo_id:
        return {'error_msg': 'repo_id invalid.'}, 400
    if not path:
        return {'error_msg': 'path invalid.'}, 400
    if not people_id:
        return {'error_msg': 'people_id invalid.'}, 400
    if not download_token:
        return {'error_msg': 'download_token invalid.'}, 400

    try:
        app.face_recognition_manager.update_people_cover_photo(repo_id, people_id, path, download_token)
    except Exception as e:
        logger.error(e)
        return make_response((e, 500))

    return {'success': True}, 200

@app.route('/delete-repo-monitored-user-cache', methods=['POST'])
def delete_repo_monitored_user_cache():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return make_response((error, 403))

    try:
        data = json.loads(request.data)
    except Exception as e:
        logger.exception(e)
        return {'error_msg': 'Bad request.'}, 400

    repo_id = data.get('repo_id')
    if not repo_id:
        return {'error_msg': 'repo_id invalid.'}, 400

    try:
        cache_key = '{}_monitor_users'.format(repo_id)
        cache.delete(cache_key)
    except Exception as e:
        logger.error(e)
        return make_response((e, 500))

    return {'success': True}, 200


@app.route('/metrics', methods=['GET'])
def get_metrics():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return make_response((error, 403))

    if error:
        return make_response((error, 500))

    metrics = redis_cache.get(REDIS_METRIC_KEY)
    if not metrics:
        return ''
    metrics = json.loads(metrics)

    metric_info = ''
    for key, metric_detail in metrics.items():
        metric_name = "%s_%s" % (key.split(':')[0], key.split(':')[2])
        node_name = key.split(':')[1]
        component_name = key.split(':')[0]
        metric_value = metric_detail.pop('metric_value', None)
        metric_type = metric_detail.pop('metric_type', None)
        metric_help = metric_detail.pop('metric_help', None)
        collected_at = metric_detail.pop('collected_at', datetime.datetime.now().isoformat())
        if metric_help:
            metric_info += "# HELP " + metric_name + " " + metric_help + '\n'
        if metric_type:
            metric_info += "# TYPE " + metric_name + " " + metric_type + '\n'
        label = 'component="%s",node="%s",collected_at="%s"' % (component_name, node_name, collected_at)
        metric_info += '%s{%s} %s\n' % (metric_name, label, str(metric_value))

    return metric_info.encode()


@app.route('/import-confluence-to-wiki', methods=['POST'])
def import_confluence_to_wiki():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return {'error_msg': str(error)}, 403

    try:
        data = json.loads(request.data)
    except Exception as e:
        logger.exception(e)
        return {'error_msg': 'Bad request.'}, 400
    repo_id = data.get('repo_id')
    space_key = data.get('space_key')
    file_path = data.get('file_path')
    seafile_server_url = data.get('seafile_server_url')
    username = data.get("username")
    
    if not repo_id:
        return {'error_msg': 'repo_id invalid.'}, 400
    if not username:
        return {'error_msg': 'username invalid.'}, 400
    if not space_key:
        return {'error_msg': 'space_key invalid.'}, 400
    if not file_path:
        return {'error_msg': 'file_path invalid'}, 400
    if not seafile_server_url:
        return {'error_msg': 'seafile_server_url invalid'}, 400
        
    try:
        task_id = event_import_task_manager.add_import_confluence_to_wiki(repo_id, space_key, file_path, username, seafile_server_url)
    except Exception as e:
        logger.error(e)
        return make_response((e, 500))

    return {'task_id': task_id}, 200

@app.route('/import-wiki-page', methods=['POST'])
def import_wiki_page():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return {'error_msg': str(error)}, 403

    try:
        data = json.loads(request.data)
    except Exception as e:
        logger.exception(e)
        return {'error_msg': 'Bad request.'}, 400
    repo_id = data.get('repo_id')
    file_path = data.get('file_path')
    username = data.get("username")
    page_id = data.get('page_id')
    from_page_id = data.get('from_page_id', None)
    page_name = data.get('page_name')
    sdoc_uuid_str = data.get('sdoc_uuid_str')

    if not repo_id:
        return {'error_msg': 'repo_id invalid.'}, 400
    if not username:
        return {'error_msg': 'username invalid.'}, 400
    if not file_path:
        return {'error_msg': 'file_path invalid'}, 400
    if not page_id:
        return {'error_msg': 'page_id invalid'}, 400
    if not page_name:
        return {'error_msg': 'page_name invalid'}, 400
    if not sdoc_uuid_str:
        return {'error_msg': 'sdoc_uuid_str invalid'}, 400
        
    try:
        task_id = event_import_task_manager.add_import_wiki_page(repo_id, file_path, username, page_id, page_name, sdoc_uuid_str, from_page_id)
    except Exception as e:
        logger.error(e)
        return make_response((e, 500))

    return {'task_id': task_id}, 200
    
@app.route('/add-repo-archive-task', methods=['POST'])
def add_repo_archive_task():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return {'error_msg': str(error)}, 403

    try:
        data = json.loads(request.data)
    except Exception as e:
        logger.exception(e)
        return {'error_msg': 'Bad request.'}, 400

    repo_id = data.get('repo_id')
    orig_storage_id = data.get('orig_storage_id')
    dest_storage_id = data.get('dest_storage_id')
    op_type = data.get('op_type')
    username = data.get('username')

    if not repo_id:
        return {'error_msg': 'repo_id invalid.'}, 400
    if not orig_storage_id:
        return {'error_msg': 'orig_storage_id invalid.'}, 400
    if not dest_storage_id:
        return {'error_msg': 'dest_storage_id invalid.'}, 400
    if not op_type:
        return {'error_msg': 'op_type invalid.'}, 400
    if not username:
        return {'error_msg': 'username invalid.'}, 400
        
    try:
        task_id = repo_archive_task_manager.add_repo_archive_task(repo_id, orig_storage_id, dest_storage_id, op_type, username)
    except Exception as e:
        logger.error(e)
        return make_response((e, 500))

    return {'task_id': task_id}, 200

@app.route('/query-archive-status', methods=['GET'])
def query_archive_status():
    is_valid, error = check_auth_token(request)
    if not is_valid:
        return make_response((error, 403))

    task_id = request.args.get('task_id')
    if not repo_archive_task_manager.is_valid_task_id(task_id):
        return make_response(('task_id not found.', 404))

    try:
        is_finished, error = repo_archive_task_manager.query_status(task_id)
    except Exception as e:
        logger.debug(e)
        return make_response((e, 500))

    if error:
        return make_response((error, 500))
    return make_response(({'is_finished': is_finished}, 200))
