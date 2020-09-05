define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'app/collections/groups',
    'app/views/repo-details',
    'app/views/group-item'
], function($, _, Backbone, Common, Groups, RepoDetailsView,
    GroupItemView) {
    'use strict';

    var GroupsView = Backbone.View.extend({
        el: '.main-panel',

        template: _.template($('#groups-tmpl').html()),
        toolbarTemplate: _.template($('#groups-toolbar-tmpl').html()),
        addGroupTemplate: _.template($('#add-group-form-tmpl').html()),

        initialize: function(options) {
            this.groups = new Groups();
            this.listenTo(this.groups, 'add', this.addOne);
            this.listenTo(this.groups, 'reset', this.reset);

            this.repoDetailsView = new RepoDetailsView({'parentView': this});
        },

        events: {
            'click #add-group': 'addGroup'
        },

        addOne: function(group, collection, options) {
            var view = new GroupItemView({
                model: group,
                repoDetailsView: this.repoDetailsView
            });
            if (options.prepend) {
                this.$groupList.prepend(view.render().el);
            } else {
                this.$groupList.append(view.render().el);
            }
        },

        reset: function() {
            this.$error.hide();
            this.$loadingTip.hide();
            if (this.groups.length) {
                this.$emptyTip.hide();
                this.$groupList.empty();
                this.groups.each(this.addOne, this);
                this.$groupList.show();
            } else {
                this.$emptyTip.show();
                this.$groupList.hide();
            }
        },

        renderToolbar: function() {
            this.$toolbar = $('<div class="cur-view-toolbar" id="groups-toolbar"></div>').html(this.toolbarTemplate());
            this.$('.common-toolbar').before(this.$toolbar);
        },

        renderMainCon: function() {
            this.$mainCon = $('<div class="main-panel-main main-panel-main-with-side" id="groups"></div>').html(this.template());
            this.$el.append(this.$mainCon);

            this.$loadingTip = this.$('.loading-tip');
            this.$groupList = this.$('#group-list');
            this.$emptyTip = this.$('.empty-tips');
            this.$error = this.$('.error');
        },

        showGroups: function() {
            this.$groupList.hide();
            this.$emptyTip.hide();
            this.$loadingTip.show();

            var _this = this;
            this.groups.fetch({
                cache: false,
                data: {'with_repos': 1}, // list repos of every group
                reset: true,
                success: function (collection, response, opts) {
                },
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    _this.$loadingTip.hide();
                    _this.$error.html(err_msg).show();
                }
            });
        },

        show: function() {
            this.renderToolbar();
            this.renderMainCon();

            this.showGroups();
        },

        hide: function() {
            this.$toolbar.detach();
            this.$mainCon.detach();
        },

        addGroup: function () {
            var $form = $(this.addGroupTemplate());
            $form.modal();
            $('#simplemodal-container').css({'height':'auto'});

            var groups = this.groups;
            var _this = this;
            $form.on('submit', function() {
                var group_name = $.trim($('[name="group_name"]', $form).val());
                var $error = $('.error', $form);
                var $submitBtn = $('[type="submit"]', $form);

                if (!group_name) {
                    $error.html(gettext("It is required.")).show();
                    return false;
                }

                $error.hide();
                Common.disableButton($submitBtn);
                groups.create({'name': group_name, 'repos':[]}, {
                    wait: true,
                    validate: true,
                    prepend: true,  // show newly created group at the top
                    success: function() {
                        if (groups.length == 1) {
                            _this.reset();
                        }
                        app.ui.sideNavView.updateGroups();
                        Common.closeModal();
                    },
                    error: function(collection, response, options) {
                        var error_msg = Common.prepareAjaxErrorMsg(response);
                        $error.html(error_msg).show();
                        Common.enableButton($submitBtn);
                    }
                });

                return false;
            });
        }

    });

    return GroupsView;
});
