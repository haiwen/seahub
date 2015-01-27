define([
    'jquery',
    'underscore',
    'backbone',
    'app/collections/group-repos',
    'app/collections/dirents',
    'app/views/group-repos',
    'app/views/add-group-repo',
    'app/views/dirents'
], function($, _, Backbone, Repos, DirentCollection, GroupRepoView, AddGroupRepoView, DirentView) {
    'use strict';

    var GroupView = Backbone.View.extend({
        el: '#main',

        prepareCsrf: function() { // TODO: move to common
            /* alias away the sync method */
            Backbone._sync = Backbone.sync;

            /* define a new sync method */
            Backbone.sync = function(method, model, options) {

                /* only need a token for non-get requests */
                if (method == 'create' || method == 'update' || method == 'delete') {
                    // CSRF token value is in an embedded meta tag 
                    // var csrfToken = $("meta[name='csrf_token']").attr('content');
                    var csrfToken = app.pageOptions.csrfToken;

                    options.beforeSend = function(xhr){
                        xhr.setRequestHeader('X-CSRFToken', csrfToken);
                    };
                }

                /* proxy the call to the old sync method */
                return Backbone._sync(method, model, options);
            };
        },

        events: {
            'click #repo-create': 'createRepo',
        },

        initialize: function() {
            this.prepareCsrf();

            this.$cont = this.$('#right-panel');
            this.$tab = this.$('#tabs div:first-child');
            this.$tabCont = this.$('#grp-repos');
            this.$tableCont = this.$('#grp-repos table');
            this.$createForm = this.$('#repo-create-form');
        },

        initializeRepos: function() {
            this.listenTo(Repos, 'add', this.addOne);
            this.listenTo(Repos, 'reset', this.addAll);
            // this.listenTo(Repos, 'sync', this.render);
            this.listenTo(Repos, 'all', this.render); // XXX: really render table when recieve any event ?
        },

        initializeDirents: function() {
            this.listenTo(this.dirents, 'add', this.addOneDirent);
            this.listenTo(this.dirents, 'reset', this.addAllDirent);
            // this.listenTo(this.dirents, 'sync', this.render);
            this.listenTo(this.dirents, 'all', this.renderDirent);
        },

        all: function(event) {
            console.log('event: ' + event);
        },

        addOne: function(repo, collection, options) {
            console.log('add repo: ' + repo.get('name'));
            var view = new GroupRepoView({model: repo});
            if (options.prepend) {
                $('tr:first', this.$tableCont).after(view.render().el);
            } else {
                this.$tableCont.append(view.render().el);
            }
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

        render: function(event) {
            console.log('got event: ' + event + ', render repo list...' );

            this.hideLoading();
            if (Repos.length) {
                this.hideEmptyTips();
                this.showTable();
            } else {
                this.showEmptyTips();
                this.hideTable();
            }
        },

        showRepoList: function() {
            this.initializeRepos();
            Repos.fetch({reset: true});
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
        },

        createRepo: function() {
            new AddGroupRepoView();
        }

    });

    return GroupView;
});
