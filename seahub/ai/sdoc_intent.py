"""Server-side SDoc AI Chat intent routing.

Implements the deterministic routing rules from design document section 2.1.
The result determines the dispatch path:

  * ``answer``              -> existing ordinary AI Chat chain (read-only).
  * ``answer_then_review``  -> one ordinary analysis message, then a Review.
  * ``review``              -> create a ReviewTask (structured ChangeSet).
  * ``clarify``             -> ordinary assistant clarification, no ReviewTask.
  * ``unsupported_write``   -> ordinary assistant capability note, no ReviewTask.

Classification runs on the server. The frontend must not decide the route by
keyword or by the presence of an ``onReviewSubmit`` callback.
"""

# Highest precedence: explicit read-only / negation constraints.
READONLY_PATTERNS = (
    '不要修改', '不要改', '别修改', '别改', '不要生成建议', '不要写入',
    '不要应用', '只读', '仅总结', '仅分析', '仅解释', '只总结', '只分析',
    '只解释', '只回答', '不要润色', '不要替换', '不要删除',
)

# Informational / reading expressions (default to ordinary chat).
INFORMATIONAL_PATTERNS = (
    '分析', '总结', '解释', '提取', '概括', '评价', '找出', '为什么',
    '讲什么', '有哪些', '什么内容', '介绍', '梳理', '提炼', '归纳',
)

# Explicit write expressions (enter review).
WRITE_PATTERNS = (
    '修改', '改写', '润色', '替换', '删除', '补充', '调整', '修正',
    '改成', '改为', '改一下', '改一改', '精简', '扩写', '重写', '改进',
    '修订', '完善', '转换为', '转换成', '转为', '转成',
)

# Vague expressions that must not write by default: give diagnosis/advice and
# clarify if needed.
VAGUE_PATTERNS = (
    '优化', '审阅', '检查一下', '看看',
)

# Write targets that remain unsupported: structural table operations. Cell text
# (including the header row) is writable via replace_table_cell_text.
UNSUPPORTED_TABLE_PATTERNS = (
    '合并单元格', '拆分单元格', '行列', '删除行', '删除列',
    '删除表格', '新建表格', '插入表格', '创建表格',
)


def classify_sdoc_intent(prompt):
    """Return answer | answer_then_review | review | clarify."""
    text = prompt or ''

    if any(pattern in text for pattern in READONLY_PATTERNS):
        return 'answer'

    has_informational = any(pattern in text for pattern in INFORMATIONAL_PATTERNS)
    has_write = any(pattern in text for pattern in WRITE_PATTERNS)
    is_vague = any(pattern in text for pattern in VAGUE_PATTERNS)

    if has_informational and has_write:
        return 'answer_then_review'

    if is_vague and not has_write:
        return 'clarify'

    if has_write:
        return 'review'

    if has_informational:
        return 'answer'

    return 'answer'


def phase_write_supported(prompt):
    """Return False when a review request targets an unsupported write capability."""
    text = prompt or ''
    if any(pattern in text for pattern in UNSUPPORTED_TABLE_PATTERNS):
        return False
    return True


def route_sdoc_prompt(prompt):
    """Full routing decision including the write-capability gate."""
    intent = classify_sdoc_intent(prompt)
    if intent == 'review' and not phase_write_supported(prompt):
        return 'unsupported_write'
    return intent
