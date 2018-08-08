define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/address-book-group-item',
    'sysadmin-app/collection/address-book-groups'
], function($, _, Backbone, Common, GroupView, GroupCollection) {
    'use strict';

    var view = Backbone.View.extend({

        id: 'address-book',

        template: _.template($("#address-book-tmpl").html()),
        groupAddFormTemplate: _.template($("#address-book-group-add-form-tmpl").html()),

        initialize: function() {
            this.groupCollection = new GroupCollection();
            this.listenTo(this.groupCollection, 'add', this.addOne);
            this.listenTo(this.groupCollection, 'reset', this.reset);
            this.render();
        },

        render: function() {
            this.$el.append(this.template());

            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            this.$error = this.$('.error');
        },

        events: {
            'click .js-add-group': 'addGroup'
        },

        initPage: function() {
            this.$loadingTip.show();
            this.$table.hide();
            this.$tableBody.empty();
            this.$emptyTip.hide();
            this.$error.hide();
        },

        addGroup: function () {
            var $form = $(this.groupAddFormTemplate({
                    'title': gettext("New Department")
                })),
                groups = this.groupCollection,
                _this = this;

            $form.modal();
            $('#simplemodal-container').css({'height':'auto'});

            $form.submit(function() {
                var group_name = $.trim($('[name="group_name"]', $form).val());
                var group_owner = 'system admin';
                var $error = $('.error', $form);
                var $submitBtn = $('[type="submit"]', $form);

                if (!group_name) {
                    $error.html(gettext("Name is required.")).show();
                    return false;
                }

                $error.hide();
                Common.disableButton($submitBtn);

                groups.create({
                    'parent_group': -1,
                    'group_name': group_name, 
                    'group_owner': group_owner
                }, {
                    prepend: true,
                    wait: true,
                    success: function() {
                        if (groups.length == 1) {
                            groups.reset(groups.models);
                        }
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
            return false;
        },

        hide: function() {
            this.$el.detach();
            this.attached = false;
        },

        show: function(option) {
            this.option = option;
            if (!this.attached) {
                this.attached = true;
                $("#right-panel").html(this.$el);
            }
            this.getContent();
        },

        getContent: function() {
            this.initPage();
            var _this = this;
            this.groupCollection.fetch({
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    _this.$error.html(err_msg).show();
                },
                complete:function() {
                    _this.$loadingTip.hide();
                }
            });
        },

        reset: function() {
            this.initPage();

            this.$loadingTip.hide();
            if (this.groupCollection.length > 0) {
                this.groupCollection.each(this.addOne, this);
                this.$table.show();
            } else {
                this.$emptyTip.show();
            }
        },

        addOne: function(group, collection, options) {
            var view = new GroupView({model: group});
            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }

        }
    });

    return view;

});
