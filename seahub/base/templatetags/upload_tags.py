# Copyright (c) 2012-2016 Seafile Ltd.
from django import template
from django.utils.safestring import mark_safe

register = template.Library()

@register.simple_tag
def upload_js():
    return mark_safe("""
<!-- The template to display files available for upload -->
<script id="template-upload" type="text/x-tmpl">
{% for (var i=0, file; file=o.files[i]; i++) { %}
    <tr class="template-upload fade">
        <td width="50%">
            <p class="name ellipsis" title="{%=file.relative_path || file.name%}">
            {%=file.relative_path || file.name%}
            </p>
            <p class="error ellipsis"></p>
        </td>
        <td width="30%">
            <span class="size"></span>
            <div class="progress progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="bar" style="width:0%;"></div></div>
        </td>
        <td width="20%">
            {% if (!o.options.autoUpload) { %}
            <button class="btn btn-success start" disabled>
                <span>{%=locale.fileupload.start%}</span>
            </button>
            {% } %}
            {% if (!i) { %}
            <button class="btn btn-warning cancel">
                <span>{%=locale.fileupload.cancel%}</span>
            </button>
            {% } %}
        </td>
    </tr>
{% } %}
</script>
<!-- The template to display files after upload -->
<script id="template-download" type="text/x-tmpl">
{% for (var i=0, file; file=o.files[i]; i++) { %}
    <tr class="template-download fade">
        <td width="50%">
            <p class="name ellipsis" title="{%=file.relative_path || file.name%}">
            {%=file.relative_path || file.name%}
            </p>
            <p class="error ellipsis">{% if (file.error) { %}{%=file.error%}{% } %}</p>
        </td>
        <td width="30%">
            <span class="size">{%=o.formatFileSize(file.size)%}</span>
        </td>
        <td width="20%">
            <span class="tip">
            {% if (file.canceled) { %}
                {%=locale.fileupload.canceled%}
            {% } %}
            {% if (file.uploaded) { %}
                {%=locale.fileupload.uploaded%}
            {% } %}
            </span>
        </td>
    </tr>
{% } %}
</script>
""")
