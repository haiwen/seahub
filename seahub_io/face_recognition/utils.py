import base64
import os
import json
import posixpath

from seaserv import seafile_api

from seahub_io.repo_metadata.utils import query_metadata_rows, get_metadata_by_obj_ids
from seahub_io.repo_metadata.constants import FACES_TABLE, METADATA_TABLE
from seahub_io.face_recognition.constants import UNKNOWN_PEOPLE_NAME
from seahub_io.app.config import SEAFILE_AI_SECRET_KEY, SEAFILE_AI_SERVER_URL
from seahub_io.repo_metadata.metadata_server_api import MetadataServerAPI
from seahub_io.repo_metadata.seafile_ai_api import SeafileAIAPI


VECTOR_DEFAULT_FLAG = '0'
FACE_EMBEDDING_DIM = 512
FACES_TMP_DIR = '/tmp'
FACES_SAVE_PATH = '_Internal/Faces'
EMBEDDING_UPDATE_LIMIT = 200
SUPPORTED_IMAGE_FORMATS = ('jpeg', 'jpg', 'heic', 'png', 'bmp', 'tif', 'tiff', 'jfif', 'jpe', 'ppm', 'heic')


def feature_distance(feature1, feature2):
    import numpy as np
    diff = np.subtract(feature1, feature2)
    dist = np.sum(np.square(diff), 0)
    return dist


def b64encode_embeddings(embeddings):
    import numpy as np
    embedding_array = np.array(embeddings).astype(np.float32)
    encode = base64.b64encode(embedding_array.tobytes())
    return encode.decode('utf-8')


def b64decode_embeddings(encode):
    import numpy as np
    decode = base64.b64decode(encode)
    embedding_array = np.frombuffer(decode, dtype=np.float32)
    face_num = len(embedding_array) // FACE_EMBEDDING_DIM
    embedding = embedding_array.reshape((face_num, FACE_EMBEDDING_DIM)).tolist()
    return embedding


def get_cluster_by_center(center, clusters):
    min_distance = float('inf')
    nearest_cluster = None
    for cluster in clusters:
        vector = cluster.get(FACES_TABLE.columns.vector.name)
        if not vector:
            continue

        vector = b64decode_embeddings(vector)[0]
        distance = feature_distance(center, vector)
        if distance < 1 and distance < min_distance:
            min_distance = distance
            nearest_cluster = cluster
    return nearest_cluster, min_distance


def get_faces_rows(repo_id, metadata_server_api):
    sql = f'SELECT * FROM `{FACES_TABLE.name}`'
    query_result = query_metadata_rows(repo_id, metadata_server_api, sql)
    clustered_rows = []
    unclustered_rows = []
    for row in query_result:
        if row.get(FACES_TABLE.columns.name.name) == UNKNOWN_PEOPLE_NAME:
            unclustered_rows.append(row)
        else:
            clustered_rows.append(row)
    return clustered_rows, unclustered_rows


def get_image_face(path, download_token, seafile_ai_api, center=None):
    faces = seafile_ai_api.face_embeddings(path, download_token, True).get('faces', [])
    if not faces:
        return None

    if len(faces) == 1:
        return base64.b64decode(faces[0]['face'])
    
    if center:
        sim = [feature_distance(center, face['embedding']) for face in faces]
        return base64.b64decode(faces[sim.index(min(sim))]['face'])

    return base64.b64decode(faces[0]['face'])


def save_cluster_face(repo_id, related_row_ids, row_ids, id_to_record, cluster_center, face_row_id, seafile_ai_api):
    face_image = None
    for row_id in related_row_ids:
        if row_ids.count(row_id) == 1:
            record = id_to_record[row_id]
            break

    if not face_image:
        record = id_to_record[related_row_ids[0]]
    obj_id = record[METADATA_TABLE.columns.obj_id.name]
    parent_dir = record.get(METADATA_TABLE.columns.parent_dir.name)
    file_name = record.get(METADATA_TABLE.columns.file_name.name)
    path = os.path.join(parent_dir, file_name)
    token = seafile_api.get_fileserver_access_token(repo_id, obj_id, 'download', 'system', use_onetime=True)
    face_image = get_image_face(path, token, seafile_ai_api, cluster_center.tolist())

    if not face_image:
        return

    filename = f'{face_row_id}.jpg'
    save_face(repo_id, face_image, filename)


def get_min_cluster_size(faces_num):
    return max(faces_num // 100, 5)


def save_face(repo_id, image, filename, replace=False):
    tmp_content_path = posixpath.join(FACES_TMP_DIR, filename)
    with open(tmp_content_path, 'wb') as f:
        f.write(image)

    if replace:
        seafile_api.del_file(repo_id, FACES_SAVE_PATH, json.dumps([filename]), 'system')
    seafile_api.post_file(repo_id, tmp_content_path, FACES_SAVE_PATH, filename, 'system')
    os.remove(tmp_content_path)


def recognize_faces_by_obj_ids(repo_id, obj_ids):
    metadata_server_api = MetadataServerAPI('seahub_io')
    seafile_ai_api = SeafileAIAPI(SEAFILE_AI_SERVER_URL, SEAFILE_AI_SECRET_KEY)
    query_result = get_metadata_by_obj_ids(repo_id, obj_ids, metadata_server_api)
    if not query_result:
        return

    clustered_rows, unclustered_rows = get_faces_rows(repo_id, metadata_server_api)
    updated_rows = list()
    row_id_map = dict()
    for row in query_result:
        if row.get(METADATA_TABLE.columns.face_links.name):
            continue

        row_id = row[METADATA_TABLE.columns.id.name]
        if not row.get(METADATA_TABLE.columns.face_vectors.name):
            obj_id = row[METADATA_TABLE.columns.obj_id.name]
            parent_dir = row.get(METADATA_TABLE.columns.parent_dir.name)
            file_name = row.get(METADATA_TABLE.columns.file_name.name)
            path = os.path.join(parent_dir, file_name)
            token = seafile_api.get_fileserver_access_token(repo_id, obj_id, 'download', 'system', use_onetime=True)
            faces = seafile_ai_api.face_embeddings(path, token).get('faces', [])
            face_embeddings = [face['embedding'] for face in faces]
            vector = b64encode_embeddings(face_embeddings) if face_embeddings else VECTOR_DEFAULT_FLAG
            updated_rows.append({
                METADATA_TABLE.columns.id.name: row_id,
                METADATA_TABLE.columns.face_vectors.name: vector,
            })
        else:
            vector = row[METADATA_TABLE.columns.face_vectors.name]
            face_embeddings = b64decode_embeddings(vector) if vector != VECTOR_DEFAULT_FLAG else []

        for item in face_embeddings:
            cluster, _ = get_cluster_by_center(item, clustered_rows)
            if cluster:
                cluster_id = cluster[FACES_TABLE.columns.id.name]
            else:
                cluster_id = unclustered_rows[0][FACES_TABLE.columns.id.name]

            if row_id not in row_id_map:
                row_id_map[row_id] = []
            row_id_map[row_id].append(cluster_id)

    if updated_rows:
        metadata_server_api.update_rows(repo_id, METADATA_TABLE.id, updated_rows)
    if row_id_map:
        metadata_server_api.update_link(repo_id, FACES_TABLE.face_link_id, METADATA_TABLE.id, row_id_map)
