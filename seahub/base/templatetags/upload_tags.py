from django import template

register = template.Library()

@register.simple_tag
def upload_js():
    return """
<!-- The template to display files available for upload -->
<script id="template-upload" type="text/x-tmpl">
{% for (var i=0, file; file=o.files[i]; i++) { %}
    <tr class="template-upload fade">
        {% if (file.error) { %}
            <td class="name ellipsis" title="{%=file.name%}">{%=file.name%}</td>
            <td class="size">{%=o.formatFileSize(file.size)%}</td>
            <td class="error"><span class="label label-important">{%=locale.fileupload.error%}</span> {%=locale.fileupload.errors[file.error] || file.error%}</td>
        {% } else if (o.files.valid && !i) { %}
            <td class="name ellipsis" title="{%=file.name%}">
                {%=file.name%}
                <div class="progress progress-success progress-striped active"><div class="bar" style="width:0%;"></div></div>
            </td>
            <td class="size">{%=o.formatFileSize(file.size)%}</td>
            <td class="start">{% if (!o.options.autoUpload) { %}
                <button class="btn btn-success">
                    <span>{%=locale.fileupload.start%}</span>
                </button>
            {% } %}</td>
        {% } else { %}
            <td class="name ellipsis" title="{%=file.name%}">{%=file.name%}</td>
            <td class="size">{%=o.formatFileSize(file.size)%}</td>
            <td></td>
        {% } %}
        <td class="cancel">{% if (!i) { %}
            <button class="btn btn-warning">
                <span>{%=locale.fileupload.cancel%}</span>
            </button>
        {% } %}</td>
    </tr>
{% } %}
</script>
<!-- The template to display files after upload -->
<script id="template-download" type="text/x-tmpl">
{% for (var i=0, file; file=o.files[i]; i++) { %}
    <tr class="template-download fade">
            <td class="name ellipsis" title="{%=file.name%}">{%=file.name%}</td>
            <td class="size">{%=o.formatFileSize(file.size)%}</td>
        {% if (file.error) { %}
            <td class="error" colspan="2"><span class="label label-important">{%=locale.fileupload.error%}:</span> {%=locale.fileupload.errors[file.error] || file.error%}</td>
        {% } else if (file.canceled) { %}
            <td colspan="2" class="tip">{%=locale.fileupload.canceled%}</td>
        {% } else { %}
            <td colspan="2" class="tip">{%=locale.fileupload.uploaded%}</td>
        {% } %}
    </tr>
{% } %}
</script>
"""
