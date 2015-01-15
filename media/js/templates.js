(function(app){
    "use strict";
    app.templates = {
        repo: '' +
            '<td>' +
                '<% if (encrypted) { %>' +
                '<img src="<%= app.utils.getMediaUrl() %>img/sync-folder-encrypt-20.png" title=Read-Write" alt="directory icon" />' +
                '<% } else { %>' +
                '<img src="<%= app.utils.getMediaUrl() %>img/sync-folder-20.png" title=Read-Write" alt="directory icon" />' +
                '<% } %>' +
            '</td>' +
            '<td><a href="#/libs/<%= id %>"><%- name %></a></td>' +
            '<td><%- desc %></td>' +
            '<td><%- mtime %></td>' +
            '<td><div>' +
                '<img src="<%= app.utils.getMediaUrl() %>img/share_20.png" alt="" class="repo-share-btn op-icon vh" title="Share" />' +
                '<img src="<%= app.utils.getMediaUrl() %>img/rm.png" class="repo-delete-btn op-icon vh" title="Delete" />' +
            '</div></td>'
    };

}(app));
