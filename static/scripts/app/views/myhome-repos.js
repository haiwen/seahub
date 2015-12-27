define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/repos',
    'app/views/repo',
    'app/views/add-repo',
], function($, _, Backbone, Common, RepoCollection, RepoView, AddRepoView) {
    'use strict';

    var ReposView = Backbone.View.extend({
        el: $('#my-own-repos'),

        reposHdTemplate: _.template($('#my-repos-hd-tmpl').html()),

        events: {
            'click .repo-create': 'createRepo',
            'click .by-name': 'sortByName',
            'click .by-time': 'sortByTime'
        },

        initialize: function(options) {
            this.$table = this.$('table');
            this.$tableHead = $('thead', this.$table);
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            this.$repoCreateBtn = this.$('.repo-create');

            this.repos = new RepoCollection();
            this.listenTo(this.repos, 'add', this.addOne);
            this.listenTo(this.repos, 'reset', this.reset);

            // hide 'hidden-op' popup
            $(document).click(function(e) {
                var target = e.target || event.srcElement;
                var $popup = $('.repo-hidden-op:visible');
                if ($popup.length > 0 &&  // There is a visible repo op popup
                    !$('.more-op-icon', $popup.closest('tr')).is(target) &&
                    !$popup.is(target) &&
                    !$popup.find('*').is(target)) {
                    // when the popup and op-icon is not target
                    // hide the popup and remove the highlight if the current repo
                    // is not the target
                    $popup.addClass('hide');
                    var $tr = $popup.closest('tr');
                    if (!$tr.find('*').is(target)) {
                        $tr.removeClass('hl').find('.op-icon').addClass('vh');
                        $('.my-own-repos-table tr:gt(0)').each(function() {
                            if ($(this).find('*').is(target)) {
                                $(this).addClass('hl').find('.op-icon').removeClass('vh');
                            }
                        });
                    }
                }
            });

        },

        addOne: function(repo, collection, options) {
            var view = new RepoView({model: repo});
            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
        },

        renderReposHd: function() {
            this.$tableHead.html(this.reposHdTemplate());
        },

        reset: function() {
            this.$('.error').hide();
            this.$loadingTip.hide();
            if (this.repos.length) {
                this.$emptyTip.hide();
                this.renderReposHd();
                this.$tableBody.empty();
                this.repos.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$table.hide();
                this.$emptyTip.show();
            }

            if (app.pageOptions.guide_enabled) {
                $('#guide-for-new').modal({appendTo: '#main', focus:false});
                app.pageOptions.guide_enabled = false;
            }
        },

        showMyRepos: function() {
            this.$el.show();
            this.$table.hide();
            var $loadingTip = this.$loadingTip;
            $loadingTip.show();
            var _this = this;
            this.repos.fetch({
                cache: false, // for IE
                reset: true,
                success: function (collection, response, opts) {
                },
                error: function (collection, response, opts) {
                    $loadingTip.hide();
                    var $error = _this.$('.error');
                    var err_msg;
                    if (response.responseText) {
                        if (response['status'] == 401 || response['status'] == 403) {
                            err_msg = gettext("Permission error");
                        } else {
                            err_msg = gettext("Error");
                        }
                    } else {
                        err_msg = gettext('Please check the network.');
                    }
                    $error.html(err_msg).show();
                }
            });
        },

        show: function() {
            this.showMyRepos();
        },

        hide: function() {
            this.$el.hide();
        },

        createRepo: function() {
            new AddRepoView(this.repos);
        },

        sortByName: function() {
            $('.by-time .sort-icon').hide();
            var repos = this.repos;
            var el = $('.by-name .sort-icon', this.$table);
            repos.comparator = function(a, b) { // a, b: model
                var result = Common.compareTwoWord(a.get('name'), b.get('name'));
                if (el.hasClass('icon-caret-up')) {
                    return -result;
                } else {
                    return result;
                }
            };
            repos.sort();
            this.$tableBody.empty();
            repos.each(this.addOne, this);
            el.toggleClass('icon-caret-up icon-caret-down').show();
            repos.comparator = null;
        },

        sortByTime: function() {
            $('.by-name .sort-icon').hide();
            var repos = this.repos;
            var el = $('.by-time .sort-icon', this.$table);
            repos.comparator = function(a, b) { // a, b: model
                if (el.hasClass('icon-caret-down')) {
                    return a.get('mtime') < b.get('mtime') ? 1 : -1;
                } else {
                    return a.get('mtime') < b.get('mtime') ? -1 : 1;
                }
            };
            repos.sort();
            this.$tableBody.empty();
            repos.each(this.addOne, this);
            el.toggleClass('icon-caret-up icon-caret-down').show();
            repos.comparator = null;
        }

    });

    return ReposView;
});
