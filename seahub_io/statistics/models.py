from sqlalchemy.orm import mapped_column
from sqlalchemy.sql.sqltypes import Integer, BigInteger, String, DateTime
from sqlalchemy.sql.schema import Index

from seahub_io.db import Base


class UserActivityStat(Base):
    __tablename__ = 'UserActivityStat'

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    name_time_md5 = mapped_column(String(length=32), unique=True)
    username = mapped_column(String(length=255))
    timestamp = mapped_column(DateTime, nullable=False, index=True)
    org_id = mapped_column(Integer, nullable=False)

    __table_args__ = (Index('idx_activity_time_org', 'timestamp', 'org_id'), )

    def __init__(self, name_time_md5, org_id, username, timestamp):
        super().__init__()
        self.name_time_md5 = name_time_md5
        self.username = username
        self.timestamp = timestamp
        self.org_id = org_id


class UserTraffic(Base):
    __tablename__ = 'UserTraffic'

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    user = mapped_column(String(length=255), nullable=False)
    org_id = mapped_column(Integer, index=True)
    timestamp = mapped_column(DateTime, nullable=False)
    op_type = mapped_column(String(length=48), nullable=False)
    size = mapped_column(BigInteger, nullable=False)

    __table_args__ = (Index('idx_traffic_time_user', 'timestamp', 'user', 'org_id'), )

    def __init__(self, user, timestamp, op_type, size, org_id):
        super().__init__()
        self.user = user
        self.timestamp = timestamp
        self.op_type = op_type
        self.size = size
        self.org_id = org_id


class SysTraffic(Base):
    __tablename__ = 'SysTraffic'

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id = mapped_column(Integer, index=True)
    timestamp = mapped_column(DateTime, nullable=False)
    op_type = mapped_column(String(length=48), nullable=False)
    size = mapped_column(BigInteger, nullable=False)

    __table_args__ = (Index('idx_systraffic_time_org', 'timestamp', 'org_id'), )

    def __init__(self, timestamp, op_type, size, org_id):
        super().__init__()
        self.timestamp = timestamp
        self.op_type = op_type
        self.size = size
        self.org_id = org_id
