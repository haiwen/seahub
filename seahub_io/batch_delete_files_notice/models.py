# -*- coding: utf-8 -*-
from sqlalchemy import Column, String, DateTime, BigInteger

from seahub_io.db import Base


class DeletedFilesCount(Base):
    __tablename__ = 'deleted_files_count'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    repo_id = Column(String(length=36), nullable=False, index=True)
    deleted_time = Column(DateTime, nullable=False, index=True)
    files_count = Column(BigInteger, nullable=False)

    def __init__(self, repo_id, files_count, deleted_time):
        self.repo_id = repo_id
        self.deleted_time = deleted_time
        self.files_count = files_count
