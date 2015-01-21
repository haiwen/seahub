define([
    'jquery',
    'underscore',
    'backbone',
    'app/collections/group-repos',
    'app/collections/dirents',
    'app/views/group-repos',
    'app/views/dirents'
], function($, _, Backbone, Repos, DirentCollection, GroupRepoView, DirentView) {
    'use strict';

    var GroupView = Backbone.View.extend({
        el: '#main',

        initialize: function() {
            $.ajaxPrefilter(function(options, originalOptions, jqXHR) {
                var token;
                options.xhrFields = {
                    withCredentials: true
                };
                // token = $('meta[name="csrf-token"]').attr('content');
                token = app.pageOptions.csrfToken;
                if (token) {
                    return jqXHR.setRequestHeader('X-CSRF-Token', token);
                }
            });

            this.$cont = this.$('#right-panel');
            this.$tab = this.$('#tabs div:first-child');
            this.$tabCont = this.$('#grp-repos');

            this.$tableCont = this.$('#grp-repos table');
        },

        initializeRepos: function() {
            this.listenTo(Repos, 'add', this.addOne);
            this.listenTo(Repos, 'reset', this.addAll);
            this.listenTo(Repos, 'sync', this.render);
        },

        initializeDirents: function() {
            this.listenTo(this.dirents, 'add', this.addOneDirent);
            this.listenTo(this.dirents, 'reset', this.addAllDirent);
            // this.listenTo(this.dirents, 'sync', this.render);
            this.listenTo(this.dirents, 'all', this.renderDirent);
        },
        
        addOne: function(repo) {
            console.log('add repo: ' + repo);
            var view = new GroupRepoView({model: repo});
            this.$tableCont.append(view.render().el);
        },

        addAll: function() {
            console.log('add all');
            this.resetTable();
            Repos.each(this.addOne, this);
        },

        addOneDirent: function(dirent) {
            var view = new DirentView({model: dirent});
            this.$tableCont.append(view.render().el);
        },

        addAllDirent: function() {
            this.$tableCont.empty();
            this.dirents.each(this.addOneDirent, this);
        },

        renderDirent: function(eventName) {
            console.log('render dirents with event: ' + eventName);
            if (this.dirents.length) {
                this.$tabCont.show();
            }
        },

        resetTable: function() {
            console.log('rest table');
            _.each($('#grp-repos table').find('tr'), function(el, idx) {
                if (idx != 0) {
                    $(el).remove(); // remove table content except first row.
                }
            });
        },

        hideTable: function() {
            this.$tableCont.hide();
        },

        showTable: function() {
            this.$tableCont.show();
        },

        hideLoading: function() {
            this.$cont.find('.loading').hide();
        },

        showLoading: function() {
            this.$cont.find('.loading').show();
        },

        hideEmptyTips: function() {
            this.$cont.find('.empty-tips').hide();
        },

        showEmptyTips: function() {
            this.$cont.find('.empty-tips').show();
        },

        render: function(eventName) {
            this.hideLoading();
            if (Repos.length) {
                this.hideEmptyTips();
                this.showTable();
            } else {
                this.showEmptyTips();
            }
        },

        showRepoList: function() {
            this.initializeRepos();
            Repos.fetch({reset: true});
            // $('#my-own-repos table').append(new RepoView().render().el);
        },

        showDirentList: function(id, path) {
            console.log('show repo page and hide repo list: ' + id + ' ' + path);

            var path = path || '/';
            this.dirents = new DirentCollection(id, path);
            this.initializeDirents();

            this.dirents.fetch({reset: true});

            // this.dirent_list = new app.DirentListView({id: id, path: path});
            // $('#my-own-repos table').children().remove();
            // $('#my-own-repos table').append(this.dirent_list.render().el);
        }
        
    });

    return GroupView;
});
