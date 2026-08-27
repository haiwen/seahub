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

import re

# Highest precedence: explicit read-only / negation constraints.
READONLY_PATTERNS = (
    '不要修改', '不要改', '别修改', '别改', '不要生成建议', '不要写入',
    '不要应用', '只读', '仅总结', '仅分析', '仅解释', '只总结', '只分析',
    '只解释', '只回答', '不要润色', '不要替换', '不要删除',
    'do not edit', 'do not modify', 'do not change', 'read only',
    'only summarize', 'only analyse', 'only analyze', 'only explain',
)

# Informational / reading expressions (default to ordinary chat).
INFORMATIONAL_PATTERNS = (
    '分析', '总结', '解释', '提取', '概括', '评价', '找出', '为什么',
    '讲什么', '有哪些', '什么内容', '介绍', '梳理', '提炼', '归纳',
    'analyze', 'analyse', 'summarize', 'explain', 'extract', 'evaluate',
    'what', 'why',
)

# Explicit write expressions (enter review).
WRITE_PATTERNS = (
    '修改', '改写', '润色', '替换', '删除', '补充', '调整', '修正',
    '改成', '改为', '改一下', '改一改', '精简', '扩写', '重写', '改进',
    '修订', '完善', '转换为', '转换成', '转为', '转成',
    'edit', 'modify', 'rewrite', 'polish', 'replace', 'delete', 'remove',
    'add', 'adjust', 'correct', 'change to', 'convert to', 'improve',
    'expand', 'shorten',
    '合并单元格', '拆分单元格', '删除行', '删除列', '删除表格',
    '新建表格', '插入表格', '创建表格',
)

# Vague expressions that must not write by default: give diagnosis/advice and
# clarify if needed.
VAGUE_PATTERNS = (
    '优化', '审阅', '检查一下', '看看',
    'optimize', 'optimise', 'review', 'check',
)

# Questions that mention editing vocabulary but request diagnosis rather than an
# actual document mutation.
DIAGNOSTIC_READ_PATTERNS = (
    '哪些地方需要修改', '哪里需要修改', '如何修改', '修改建议', '改进建议',
    'what should be changed', 'what needs to be changed',
    'what needs improvement', 'how should i change', 'suggest improvements',
)

# Write targets that remain unsupported: structural table operations. Cell text
# (including the header row) is writable via replace_table_cell_text.
UNSUPPORTED_TABLE_PATTERNS = (
    '合并单元格', '拆分单元格', '行列', '删除行', '删除列',
    '删除表格', '新建表格', '插入表格', '创建表格',
    'merge cells', 'split cells', 'delete row', 'delete column',
    'remove table', 'create table', 'insert table',
)


def _contains_pattern(text, pattern):
    if pattern.isascii():
        return re.search(r'\b%s\b' % re.escape(pattern), text) is not None
    return pattern in text


def _contains_any(text, patterns):
    return any(_contains_pattern(text, pattern) for pattern in patterns)


def classify_sdoc_intent(prompt):
    """Return answer | answer_then_review | review | clarify."""
    text = (prompt or '').casefold()

    if _contains_any(text, READONLY_PATTERNS):
        return 'answer'

    has_informational = _contains_any(text, INFORMATIONAL_PATTERNS)
    has_write = _contains_any(text, WRITE_PATTERNS)
    is_vague = _contains_any(text, VAGUE_PATTERNS)

    if has_informational and _contains_any(text, DIAGNOSTIC_READ_PATTERNS):
        return 'answer'

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
    text = (prompt or '').casefold()
    if _contains_any(text, UNSUPPORTED_TABLE_PATTERNS):
        return False
    return True


def route_sdoc_prompt(prompt):
    """Full routing decision including the write-capability gate."""
    intent = classify_sdoc_intent(prompt)
    if intent in ('review', 'answer_then_review') and not phase_write_supported(prompt):
        return 'unsupported_write'
    return intent
