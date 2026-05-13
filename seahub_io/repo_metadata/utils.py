import io
import json
import os
import pytz
import math
import exiftool
import tempfile
import requests
import logging

from datetime import timedelta, timezone, datetime

from seafobj import fs_mgr

from seahub_io.app.config import METADATA_FILE_TYPES, BAIDU_MAP_KEY, BAIDU_MAP_URL, SERVER_GOOGLE_MAP_KEY, GOOGLE_MAP_GEOCODE_API_URL
from seahub_io.repo_metadata.view_data_sql import view_data_2_sql, sort_data_2_sql
from seahub_io.utils import timestamp_to_isoformat_timestr
from seahub_io.repo_metadata.constants import PrivatePropertyKeys, METADATA_OP_LIMIT, METADATA_TABLE, \
    FILE_DETAIL_EXTRACT_CONTENT_LIMIT, EXTRACT_DETAIL_FILE_SIZE_LIMIT


logger = logging.getLogger(__name__)


def gen_fileext_type_map():
    """
    Generate previewed file extension and file type relation map.
    """
    ext_to_type = {}
    for file_type in list(METADATA_FILE_TYPES.keys()):
        for file_ext in METADATA_FILE_TYPES.get(file_type):
            ext_to_type[file_ext] = file_type

    return ext_to_type


FILEEXT_TYPE_MAP = gen_fileext_type_map()

def wgs2gcj(point_key):
    """
    Convert WGS-84 coordinates to GCJ-02 (Mars coordinates).
    """
    a = 6378245.0;
    ee = 0.00669342162296594323;
    lat, lng = map(float, point_key.split(','))

    def transform_lat(x, y):
        ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * math.sqrt(abs(x))
        ret += (20.0 * math.sin(6.0 * x * math.pi) + 20.0 * math.sin(2.0 * x * math.pi)) * 2.0 / 3.0
        ret += (20.0 * math.sin(y * math.pi) + 40.0 * math.sin(y / 3.0 * math.pi)) * 2.0 / 3.0
        ret += (160.0 * math.sin(y / 12.0 * math.pi) + 320 * math.sin(y * math.pi / 30.0)) * 2.0 / 3.0
        return ret

    def transform_lng(x, y):
        ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * math.sqrt(abs(x))
        ret += (20.0 * math.sin(6.0 * x * math.pi) + 20.0 * math.sin(2.0 * x * math.pi)) * 2.0 / 3.0
        ret += (20.0 * math.sin(x * math.pi) + 40.0 * math.sin(x / 3.0 * math.pi)) * 2.0 / 3.0
        ret += (150.0 * math.sin(x / 12.0 * math.pi) + 300.0 * math.sin(x / 30.0 * math.pi)) * 2.0 / 3.0
        return ret

    def out_of_china(lng, lat):
        return not (73.66 < lng < 135.05 and 3.86 < lat < 53.55)

    if out_of_china(lng, lat):
        return point_key

    dlat = transform_lat(lng - 105.0, lat - 35.0)
    dlng = transform_lng(lng - 105.0, lat - 35.0)
    radlat = lat / 180.0 * math.pi
    magic = math.sin(radlat)
    magic = 1 - ee * magic * magic
    sqrtmagic = math.sqrt(magic)
    dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * math.pi)
    dlng = (dlng * 180.0) / (a / sqrtmagic * math.cos(radlat) * math.pi)
    mglat = lat + dlat
    mglng = lng + dlng
    return f"{mglat},{mglng}"


def get_location_from_map_service(point_key):
    if BAIDU_MAP_KEY:
        params = {
            'ak': BAIDU_MAP_KEY,
            'output': 'json',
            'location': point_key,
            "coordtype": "wgs84ll",
            'extensions_poi': '1'
        }
        try:
            response = requests.get(BAIDU_MAP_URL, params=params, timeout=30)
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 0:
                    return {
                        'address': data['result']['formatted_address_poi'] or data['result']['formatted_address'],
                        'country': data['result']['addressComponent']['country'],
                        'province': data['result']['addressComponent']['province'],
                        'city': data['result']['addressComponent']['city'],
                        'district': data['result']['addressComponent']['district']
                    }
                else:
                    logger.warning(f"Baidu Map Service Request Failed: {str(data.get('message'))}")
                    return {}
        except Exception as e:
            logger.warning('Get location from baidu map service error: %s', e)
            return {}

    if SERVER_GOOGLE_MAP_KEY:
        params = {
            'latlng': wgs2gcj(point_key),
            'key': SERVER_GOOGLE_MAP_KEY,
        }
        try:
            response = requests.get(GOOGLE_MAP_GEOCODE_API_URL, params=params, timeout=30)
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'OK' and data.get('results'):
                    result = data['results'][0]
                    address_components = {
                        'country': '',
                        'province': '',
                        'city': '',
                        'district': ''
                    }

                    for component in result['address_components']:
                        types = component['types']

                        if 'country' in types:
                            address_components['country'] = component['long_name']
                        elif 'administrative_area_level_1' in types:
                            address_components['province'] = component['long_name']
                        elif 'locality' in types or 'administrative_area_level_2' in types:
                            address_components['city'] = component['long_name']
                        elif 'sublocality' in types or 'administrative_area_level_3' in types or 'sublocality_level_1' in types:
                            address_components['district'] = component['long_name']

                    return {
                        'address': result['formatted_address'],
                        'country': address_components['country'],
                        'province': address_components['province'],
                        'city': address_components['city'],
                        'district': address_components['district'],
                    }
                else:
                    logger.warning(f"Google Map Service Request Failed: {str(data.get('error_message'))}")
                    return {}
        except Exception as e:
            logger.warning('Get location from google map service error: %s', e)
            return {}

    logger.warning("Baidu map key or Google map key not configured.")
    return {}

def get_file_type_ext_by_name(filename):
    file_ext = os.path.splitext(filename)[1][1:].lower()
    file_type = FILEEXT_TYPE_MAP.get(file_ext)
    return file_type, file_ext


def is_valid_datetime(date_string, format):
    try:
        datetime.strptime(date_string, format)
        return True
    except ValueError:
        return False


def get_file_content(repo_id, obj_id, limit=-1):
    f = fs_mgr.load_seafile(repo_id, 1, obj_id)
    content = f.get_content(limit)
    return content


def get_image_details(content):
    with tempfile.NamedTemporaryFile() as temp_file:
        temp_file.write(content)
        temp_file.flush()
        temp_file_path = temp_file.name
        with exiftool.ExifToolHelper() as et:
            metadata = et.get_metadata(temp_file_path)[0]
            time_zone_str = metadata.get('EXIF:OffsetTimeOriginal', '')
            capture_time = metadata.get('EXIF:DateTimeOriginal', '')
            if is_valid_datetime(capture_time, '%Y:%m:%d %H:%M:%S'):
                capture_time = datetime.strptime(capture_time, '%Y:%m:%d %H:%M:%S')
                if time_zone_str:
                    hours, minutes = map(int, time_zone_str.split(':'))
                    tz_offset = timedelta(hours=hours, minutes=minutes)
                    tz = timezone(tz_offset)
                    capture_time = capture_time.replace(tzinfo=tz)
                    capture_time = capture_time.isoformat()
                else:
                    capture_time = timestamp_to_isoformat_timestr(capture_time.timestamp())
            else:
                capture_time = ''
            focal_length = str(metadata['EXIF:FocalLength']) + 'mm' if metadata.get('EXIF:FocalLength') else ''
            f_number = 'f/' + str(metadata['EXIF:FNumber']) if metadata.get('EXIF:FNumber') else ''
            width = metadata.get('File:ImageWidth') or metadata.get('EXIF:ImageWidth') or metadata.get('EXIF:ExifImageWidth')
            height = metadata.get('File:ImageHeight') or metadata.get('EXIF:ImageHeight') or metadata.get('EXIF:ExifImageHeight')

            if not width or not height:
                # 'Composite:ImageSize': '1178 754'
                image_size = metadata.get('Composite:ImageSize', '').split(' ')
                if len(image_size) == 2:
                    width, height = image_size
            dimensions = str(width) + 'x' + str(height) if (width and height) else ''
            details = {
                'Dimensions': dimensions,
                'Device make': metadata.get('EXIF:Make', ''),
                'Device model': metadata.get('EXIF:Model', ''),
                'Color space': metadata.get('ICC_Profile:ColorSpaceData', ''),
                'Capture time': capture_time,
                'Focal length': focal_length,
                'F number': f_number,
                'Exposure time': metadata.get('EXIF:ExposureTime', ''),
            }
            for k, v in metadata.items():
                if k.startswith('XMP') and k != 'XMP:XMPToolkit':
                    details[k[4:]] = v
            lat = metadata.get('EXIF:GPSLatitude')
            lng = metadata.get('EXIF:GPSLongitude')
            lat_ref = metadata.get('EXIF:GPSLatitudeRef')
            lng_ref = metadata.get('EXIF:GPSLongitudeRef')

            if lat and lat_ref == 'S':
                lat = -lat
            if lng and lng_ref == 'W':
                lng = -lng

            location = {
                'lat': round(lat, 6),
                'lng': round(lng, 6),
            } if lat is not None and lng is not None else {}
            return details, location


def get_video_details(content):
    with tempfile.NamedTemporaryFile() as temp_file:
        temp_file.write(content)
        temp_file.flush()
        temp_file_path = temp_file.name
        with exiftool.ExifToolHelper() as et:
            metadata = et.get_metadata(temp_file_path)[0]
            lat = metadata.get('Composite:GPSLatitude')
            lng = metadata.get('Composite:GPSLongitude')
            lat_ref = metadata.get('Composite:GPSLatitudeRef')
            lng_ref = metadata.get('Composite:GPSLongitudeRef')

            if lat and lat_ref == 'S':
                lat = -lat
            if lng and lng_ref == 'W':
                lng = -lng
            software = metadata.get('QuickTime:Software', '')
            capture_time = metadata.get('QuickTime:CreateDate', '')
            if is_valid_datetime(capture_time, '%Y:%m:%d %H:%M:%S'):
                capture_time = datetime.strptime(capture_time, '%Y:%m:%d %H:%M:%S')
                capture_time = capture_time.replace(tzinfo=pytz.utc)
                capture_time = capture_time.isoformat()
            else:
                capture_time = ''
            width = metadata.get('QuickTime:ImageWidth') or metadata.get('QuickTime:SourceImageWidth')
            height = metadata.get('QuickTime:ImageHeight') or metadata.get('QuickTime:SourceImageHeight')

            if not width or not height:
                # 'Composite:ImageSize': '540 960'
                image_size = metadata.get('Composite:ImageSize', '').split(' ')
                if len(image_size) == 2:
                    width, height = image_size
            details = {
                'Dimensions': str(width) + 'x' + str(height) if (width and height) else '',
                'Duration': str(metadata.get('QuickTime:Duration', '')),
            }
            if capture_time:
                details['Capture time'] = capture_time
            if software:
                details['Encoding software'] = software

            location = {
                'lat': round(lat, 6),
                'lng': round(lng, 6),
            } if lat is not None and lng is not None else {}
            return details, location


def add_file_details(repo_id, obj_ids, metadata_server_api, face_recognition_manager=None):
    all_updated_rows = []
    query_result = get_metadata_by_obj_ids(repo_id, obj_ids, metadata_server_api)
    if not query_result:
        return []

    if face_recognition_manager and face_recognition_manager.check_face_recognition_status(repo_id):
        rows = [row for row in query_result if not row.get(METADATA_TABLE.columns.face_vectors.name) and face_recognition_manager.is_support_format(row.get(METADATA_TABLE.columns.suffix.name))]
        if rows:
            try:
                face_recognition_manager.face_embeddings(repo_id, rows, need_classify=True)
            except Exception as e:
                logger.warning('repo_id: %s, cluster face failed, error: %s.', repo_id, e)

    # extract file info
    updated_rows = []
    columns = metadata_server_api.list_columns(repo_id, METADATA_TABLE.id).get('columns', [])
    capture_time_column = [column for column in columns if column.get('key') == PrivatePropertyKeys.CAPTURE_TIME]
    has_capture_time_column = True if capture_time_column else False
    for row in query_result:
        file_type = row.get(METADATA_TABLE.columns.file_type.name)
        suffix = row.get(METADATA_TABLE.columns.suffix.name)
        need_update_file_type = False
        if not file_type:
            file_name = row.get(METADATA_TABLE.columns.file_name.name)
            file_type, suffix = get_file_type_ext_by_name(file_name)
            need_update_file_type = True
        row_id = row[METADATA_TABLE.columns.id.name]
        obj_id = row[METADATA_TABLE.columns.obj_id.name]
        file_size = row[METADATA_TABLE.columns.size.name]

        limit = FILE_DETAIL_EXTRACT_CONTENT_LIMIT
        if file_size > EXTRACT_DETAIL_FILE_SIZE_LIMIT:
            continue
        content = get_file_content(repo_id, obj_id, limit)
        if file_type == '_picture':
            update_row = add_image_detail_row(row_id, content, has_capture_time_column)
        elif file_type == '_video':
            update_row = add_video_detail_row(row_id, content, has_capture_time_column)
        else:
            continue
        if need_update_file_type:
            update_row[METADATA_TABLE.columns.file_type.name] = file_type
            update_row[METADATA_TABLE.columns.suffix.name] = suffix
        updated_rows.append(update_row)

        if len(updated_rows) >= METADATA_OP_LIMIT:
            metadata_server_api.update_rows(repo_id, METADATA_TABLE.id, updated_rows)
            all_updated_rows.extend(updated_rows)
            updated_rows = []

    if updated_rows:
        metadata_server_api.update_rows(repo_id, METADATA_TABLE.id, updated_rows)
        all_updated_rows.extend(updated_rows)

    return all_updated_rows


def add_image_detail_row(row_id, content, has_capture_time_column):
    image_details, location = get_image_details(content)
    lng = location.get('lng', '')
    lat = location.get('lat', '')
    location_translated = {}
    if lng and lat:
        point_key = f"{lat},{lng}"
        location_translated = get_location_from_map_service(point_key)
    update_row = {
        METADATA_TABLE.columns.id.name: row_id,
        METADATA_TABLE.columns.location.name: {'lng': lng, 'lat': lat},
        METADATA_TABLE.columns.location_translated.name: location_translated,
        METADATA_TABLE.columns.file_details.name: f'\n\n```json\n{json.dumps(image_details)}\n```\n\n\n',
    }

    if has_capture_time_column:
        capture_time = image_details.get('Capture time')
        if capture_time:
            update_row[PrivatePropertyKeys.CAPTURE_TIME] = capture_time

    return update_row


def add_video_detail_row(row_id, content, has_capture_time_column):
    video_details, location = get_video_details(content)
    lng = location.get('lng', '')
    lat = location.get('lat', '')
    location_translated = {}
    if lng and lat:
        point_key = f"{lat},{lng}"
        location_translated = get_location_from_map_service(point_key)
    update_row = {
        METADATA_TABLE.columns.id.name: row_id,
        METADATA_TABLE.columns.location.name: {'lng': lng, 'lat': lat},
        METADATA_TABLE.columns.location_translated.name: location_translated,
        METADATA_TABLE.columns.file_details.name: f'\n\n```json\n{json.dumps(video_details)}\n```\n\n\n',
    }

    if has_capture_time_column:
        capture_time = video_details.get('Capture time')
        if capture_time:
            update_row[PrivatePropertyKeys.CAPTURE_TIME] = capture_time

    return update_row


def get_metadata_by_obj_ids(repo_id, obj_ids, metadata_server_api):
    sql = f'SELECT * FROM `{METADATA_TABLE.name}` WHERE `{METADATA_TABLE.columns.obj_id.name}` IN ('
    parameters = []

    for obj_id in obj_ids:
        sql += '?, '
        parameters.append(obj_id)

    if not parameters:
        return []
    sql = sql.rstrip(', ') + ');'
    query_result = metadata_server_api.query_rows(repo_id, sql, parameters).get('results', [])

    if not query_result:
        return []

    return query_result


def get_metadata_by_row_ids(repo_id, row_ids, metadata_server_api):
    sql = f'SELECT * FROM `{METADATA_TABLE.name}` WHERE `{METADATA_TABLE.columns.id.name}` IN ('
    parameters = []

    for row_id in row_ids:
        sql += '?, '
        parameters.append(row_id)

    if not parameters:
        return []
    sql = sql.rstrip(', ') + ');'
    query_result = metadata_server_api.query_rows(repo_id, sql, parameters).get('results', [])

    if not query_result:
        return []

    return query_result


def query_metadata_rows(repo_id, metadata_server_api, sql):
    rows = []
    offset = 10000
    start = 0

    while True:
        query_sql = f"{sql} LIMIT {start}, {offset}"
        response_rows = metadata_server_api.query_rows(repo_id, query_sql, []).get('results', [])
        if not response_rows:
            response_rows = []
        rows.extend(response_rows)
        if len(response_rows) < offset:
            break
        start += offset

    return rows


def gen_view_data_sql(table, columns, view, start, limit, params):
    """ generate view data sql """
    return view_data_2_sql(table, columns, view, start, limit, params)


def gen_sorts_sql(table, columns, sorts):
    """ generate sorts sql """
    return sort_data_2_sql(table, columns, sorts)
