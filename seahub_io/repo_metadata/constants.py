from seahub_io.app.config import METADATA_FILE_TYPES


class PropertyTypes:
    FILE_NAME = 'file-name'
    TEXT = 'text'
    IMAGE = 'image'
    DATE = 'date'
    LONG_TEXT = 'long-text'
    CHECKBOX = 'checkbox'
    SINGLE_SELECT = 'single-select'
    MULTIPLE_SELECT = 'multiple-select'
    DEPARTMENT_SINGLE_SELECT = 'department-single-select'
    URL = 'url'
    DURATION = 'duration'
    NUMBER = 'number'
    FILE = 'file'
    COLLABORATOR = 'collaborator'
    EMAIL = 'email'
    FORMULA = 'formula'
    CREATOR = 'creator'
    LAST_MODIFIER = 'last-modifier'
    AUTO_NUMBER = 'auto-number'
    LINK = 'link'
    CTIME = 'ctime'
    MTIME = 'mtime'
    LINK_FORMULA = 'link-formula'
    RATE = 'rate'
    GEOLOCATION = 'geolocation'
    BUTTON = 'button'
    TAGS = 'tags'


class PrivatePropertyKeys:
    ID = '_id'
    CTIME = '_ctime'
    MTIME = '_mtime'
    CREATOR = '_creator'
    LAST_MODIFIER = '_last_modifier'

    IS_DIR = '_is_dir'
    PARENT_DIR = '_parent_dir'
    FILE_CTIME = '_file_ctime'
    FILE_MTIME = '_file_mtime'
    FILE_CREATOR = '_file_creator'
    FILE_MODIFIER = '_file_modifier'
    FILE_NAME = '_name'
    FILE_TYPE = '_file_type'
    FILE_COLLABORATORS = '_collaborators'
    FILE_EXPIRE_TIME = '_expire_time'
    FILE_KEYWORDS = '_keywords'
    FILE_DESCRIPTION = '_description'
    FILE_EXPIRED = '_expired'
    FILE_STATUS = '_status'
    LOCATION = '_location'
    OBJ_ID = '_obj_id'
    SIZE = '_size'
    SUFFIX = '_suffix'
    FILE_DETAILS = '_file_details'
    CAPTURE_TIME = '_capture_time'
    OWNER = '_owner'
    FACE_VECTORS = '_face_vectors'
    FACE_LINKS = '_face_links'
    EXCLUDED_FACE_LINKS = '_excluded_face_links'
    INCLUDED_FACE_LINKS = '_included_face_links'
    TAGS = '_tags'
    LOCATION_TRANSLATED = '_location_translated'


class FilterPredicateTypes(object):
    CONTAINS = 'contains'
    NOT_CONTAIN = 'does_not_contain'
    IS = 'is'
    IS_NOT = 'is_not'
    EQUAL = 'equal'
    NOT_EQUAL = 'not_equal'
    LESS = 'less'
    GREATER = 'greater'
    LESS_OR_EQUAL = 'less_or_equal'
    GREATER_OR_EQUAL = 'greater_or_equal'
    EMPTY = 'is_empty'
    NOT_EMPTY = 'is_not_empty'
    IS_WITHIN = 'is_within'
    IS_BEFORE = 'is_before'
    IS_AFTER = 'is_after'
    IS_ON_OR_BEFORE = 'is_on_or_before'
    IS_ON_OR_AFTER = 'is_on_or_after'
    HAS_ANY_OF = 'has_any_of'
    HAS_ALL_OF = 'has_all_of'
    HAS_NONE_OF = 'has_none_of'
    IS_EXACTLY = 'is_exactly'
    IS_ANY_OF = 'is_any_of'
    IS_NONE_OF = 'is_none_of'
    INCLUDE_ME = 'include_me'
    IS_CURRENT_USER_ID = 'is_current_user_ID'


class FilterTermModifier(object):
    TODAY = 'today'
    TOMORROW = 'tomorrow'
    YESTERDAY = 'yesterday'
    ONE_WEEK_AGO = 'one_week_ago'
    ONE_WEEK_FROM_NOW = 'one_week_from_now'
    ONE_MONTH_AGO = 'one_month_ago'
    ONE_MONTH_FROM_NOW = 'one_month_from_now'
    NUMBER_OF_DAYS_AGO = 'number_of_days_ago'
    NUMBER_OF_DAYS_FROM_NOW = 'number_of_days_from_now'
    EXACT_DATE = 'exact_date'
    THE_PAST_WEEK = 'the_past_week'
    THE_PAST_MONTH = 'the_past_month'
    THE_PAST_YEAR = 'the_past_year'
    THE_NEXT_WEEK = 'the_next_week'
    THE_NEXT_MONTH = 'the_next_month'
    THE_NEXT_YEAR = 'the_next_year'
    THE_NEXT_NUMBERS_OF_DAYS = 'the_next_numbers_of_days'
    THE_PAST_NUMBERS_OF_DAYS = 'the_past_numbers_of_days'
    THIS_WEEK = 'this_week'
    THIS_MONTH = 'this_month'
    THIS_YEAR = 'this_year'


class FormulaResultType(object):
    NUMBER = 'number'
    STRING = 'string'
    DATE = 'date'
    BOOL = 'bool'
    ARRAY = 'array'


class DurationFormatsType(object):
    H_MM = 'h:mm'
    H_MM_SS = 'h:mm:ss'
    H_MM_SS_S = 'h:mm:ss.s'
    H_MM_SS_SS = 'h:mm:ss.ss'
    H_MM_SS_SSS = 'h:mm:ss.sss'


class ViewType(object):
    TABLE = 'table'
    GALLERY = 'gallery'
    MAP = 'map'
    KANBAN = 'kanban'


class FileStatusOptions(object):
    IN_PROGRESS = '_in_progress'
    IN_REVIEW = '_in_review'
    DONE = '_done'
    OUTDATED = '_outdated'

    @classmethod
    def keys(cls):
        return [cls.IN_PROGRESS, cls.IN_REVIEW, cls.DONE, cls.OUTDATED]

METADATA_OP_LIMIT = 1000


# metadata table
class MetadataTable(object):
    def __init__(self, table_id, name):
        self.id = table_id
        self.name = name

    @property
    def columns(self):
        return MetadataColumns()


def gen_file_type_options(option_ids):
    options = []

    for option_id in option_ids:
        options.append({'id': option_id, 'name': option_id})
    return options


def gen_file_status_options(option_ids):
    options = []

    for option_id in option_ids:
        options.append({'id': option_id, 'name': option_id})
    return options


class MetadataColumns(object):
    def __init__(self):
        self.id = MetadataColumn(PrivatePropertyKeys.ID, '_id', PropertyTypes.TEXT)
        self.file_creator = MetadataColumn(PrivatePropertyKeys.FILE_CREATOR, '_file_creator', PropertyTypes.TEXT)
        self.file_ctime = MetadataColumn(PrivatePropertyKeys.FILE_CTIME, '_file_ctime', PropertyTypes.DATE)
        self.file_modifier = MetadataColumn(PrivatePropertyKeys.FILE_MODIFIER, '_file_modifier', PropertyTypes.TEXT)
        self.file_mtime = MetadataColumn(PrivatePropertyKeys.FILE_MTIME, '_file_mtime', PropertyTypes.DATE)
        self.parent_dir = MetadataColumn(PrivatePropertyKeys.PARENT_DIR, '_parent_dir', PropertyTypes.TEXT)
        self.file_name = MetadataColumn(PrivatePropertyKeys.FILE_NAME, '_name', PropertyTypes.TEXT)
        self.is_dir = MetadataColumn(PrivatePropertyKeys.IS_DIR, '_is_dir', PropertyTypes.CHECKBOX)
        self.file_type = MetadataColumn(PrivatePropertyKeys.FILE_TYPE, '_file_type', PropertyTypes.SINGLE_SELECT,
                                        {'options': gen_file_type_options(list(METADATA_FILE_TYPES.keys()))})
        self.location = MetadataColumn(PrivatePropertyKeys.LOCATION, '_location', PropertyTypes.GEOLOCATION, {'geo_format': 'lng_lat'})
        self.obj_id = MetadataColumn(PrivatePropertyKeys.OBJ_ID, '_obj_id', PropertyTypes.TEXT)
        self.size = MetadataColumn(PrivatePropertyKeys.SIZE, '_size', PropertyTypes.NUMBER)
        self.suffix = MetadataColumn(PrivatePropertyKeys.SUFFIX, '_suffix', PropertyTypes.TEXT)
        self.file_details = MetadataColumn(PrivatePropertyKeys.FILE_DETAILS, '_file_details', PropertyTypes.LONG_TEXT)
        self.description = MetadataColumn(PrivatePropertyKeys.FILE_DESCRIPTION, '_description', PropertyTypes.LONG_TEXT)

        self.collaborator = MetadataColumn(PrivatePropertyKeys.FILE_COLLABORATORS, '_collaborators', PropertyTypes.COLLABORATOR)
        self.owner = MetadataColumn(PrivatePropertyKeys.OWNER, '_owner', PropertyTypes.COLLABORATOR)
        self.status = MetadataColumn(PrivatePropertyKeys.FILE_STATUS, '_status', PropertyTypes.SINGLE_SELECT,
                                    {'options': gen_file_status_options(FileStatusOptions.keys())})

        # face
        self.face_vectors = MetadataColumn(PrivatePropertyKeys.FACE_VECTORS, '_face_vectors', PropertyTypes.LONG_TEXT)
        self.face_links = MetadataColumn(PrivatePropertyKeys.FACE_LINKS, '_face_links', PropertyTypes.LINK)
        self.excluded_face_links = MetadataColumn(PrivatePropertyKeys.EXCLUDED_FACE_LINKS, '_excluded_face_links', PropertyTypes.LINK)
        self.included_face_links = MetadataColumn(PrivatePropertyKeys.INCLUDED_FACE_LINKS, '_included_face_links', PropertyTypes.LINK)

        # tag
        self.tags = MetadataColumn(PrivatePropertyKeys.TAGS, '_tags', PropertyTypes.LINK)

        # location translated
        self.location_translated = MetadataColumn(PrivatePropertyKeys.LOCATION_TRANSLATED, '_location_translated', PropertyTypes.GEOLOCATION)


class MetadataColumn(object):
    def __init__(self, key, name, type, data=None):
        self.key = key
        self.name = name
        self.type = type
        self.data = data

    def to_dict(self, data=None):
        column_data = {
            'key': self.key,
            'name': self.name,
            'type': self.type,
        }
        if self.data:
            column_data['data'] = self.data

        if data:
            column_data['data'] = data

        return column_data


# faces table
class FacesTable(object):
    def __init__(self, name, face_link_id, excluded_face_link_id, included_face_link_id):
        self.face_link_id = face_link_id
        self.excluded_face_link_id = excluded_face_link_id
        self.included_face_link_id = included_face_link_id
        self.name = name

    @property
    def columns(self):
        return FacesColumns()


class FacesColumns(object):
    def __init__(self):
        self.id = MetadataColumn('_id', '_id', PropertyTypes.TEXT)
        self.name = MetadataColumn('_name', '_name', PropertyTypes.TEXT)
        self.photo_links = MetadataColumn('_photo_links', '_photo_links', PropertyTypes.LINK)
        self.excluded_photo_links = MetadataColumn('_excluded_photo_links', '_excluded_photo_links', PropertyTypes.LINK)
        self.included_photo_links = MetadataColumn('_included_photo_links', '_included_photo_links', PropertyTypes.LINK)
        self.vector = MetadataColumn('_vector', '_vector', PropertyTypes.LONG_TEXT)


# tags table
class TagsTable(object):
    def __init__(self, name, file_link_id, self_link_id):
        self.file_link_id = file_link_id
        self.self_link_id = self_link_id
        self.name = name

    @property
    def columns(self):
        return TagsColumns()


class TagsColumns(object):
    def __init__(self):
        self.id = MetadataColumn('_id', '_id', PropertyTypes.TEXT)
        self.name = MetadataColumn('_tag_name', '_tag_name', PropertyTypes.TEXT)
        self.color = MetadataColumn('_tag_color', '_tag_color', PropertyTypes.TEXT)
        self.file_links = MetadataColumn('_tag_file_links', '_tag_file_links', PropertyTypes.LINK)
        self.parent_links = MetadataColumn('_tag_parent_links', '_tag_parent_links', PropertyTypes.LINK)
        self.sub_links = MetadataColumn('_tag_sub_links', '_tag_sub_links', PropertyTypes.LINK)


METADATA_TABLE = MetadataTable('0001', 'Table1')
METADATA_TABLE_SYS_COLUMNS = [
    METADATA_TABLE.columns.file_creator.to_dict(),
    METADATA_TABLE.columns.file_ctime.to_dict(),
    METADATA_TABLE.columns.file_modifier.to_dict(),
    METADATA_TABLE.columns.file_mtime.to_dict(),
    METADATA_TABLE.columns.parent_dir.to_dict(),
    METADATA_TABLE.columns.file_name.to_dict(),
    METADATA_TABLE.columns.is_dir.to_dict(),
    METADATA_TABLE.columns.file_type.to_dict(),
    METADATA_TABLE.columns.location.to_dict(),
    METADATA_TABLE.columns.obj_id.to_dict(),
    METADATA_TABLE.columns.size.to_dict(),
    METADATA_TABLE.columns.suffix.to_dict(),
    METADATA_TABLE.columns.file_details.to_dict(),
    METADATA_TABLE.columns.description.to_dict(),
    METADATA_TABLE.columns.location_translated.to_dict(),
    METADATA_TABLE.columns.status.to_dict(),
]


FACES_TABLE = FacesTable('faces', '0001', '0004', '0005')

TAGS_TABLE = TagsTable('tags', '0002', '0003')

ZERO_OBJ_ID = '0000000000000000000000000000000000000000'


FILE_DETAIL_EXTRACT_CONTENT_LIMIT = 20 * 1024 * 1024
EXTRACT_DETAIL_FILE_SIZE_LIMIT = 100 * 1024 * 1024
