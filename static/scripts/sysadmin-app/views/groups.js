define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/group',
    'sysadmin-app/collection/groups'
], function($, _, Backbone, Common, GroupView, GroupCollection) {
    'use strict';

    var GroupsView = Backbone.View.extend({

        id: 'admin-groups',

        template: _.template($("#groups-tmpl").html()),
        groupAddFormtemplate: _.template($("#group-add-form-tmpl").html()),

        initialize: function() {
            this.groupCollection = new GroupCollection();
            this.listenTo(this.groupCollection, 'add', this.addOne);
            this.listenTo(this.groupCollection, 'reset', this.reset);
            this.render();
        },

        render: function() {
            this.$el.append(this.template());

            this.$newGroup = this.$('.js-add-group');
            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            this.$jsPrevious = this.$('.js-previous');
            this.$jsNext = this.$('.js-next');
            this.$error = this.$('.error');
        },

        events: {
            'click .js-add-group': 'addGroup',
            'click .js-export-excel': 'exportExcel',
            'click #paginator .js-next': 'getNextPage',
            'click #paginator .js-previous': 'getPreviousPage'
        },

        initPage: function() {
            this.$loadingTip.show();
            this.$table.hide();
            this.$tableBody.empty();
            this.$jsNext.hide();
            this.$jsPrevious.hide();
            this.$emptyTip.hide();
            this.$error.hide();
        },

        addGroup: function () {
            var $form = $(this.groupAddFormtemplate()),
                groups = this.groupCollection,
                _this = this;

            $form.modal();
            $('#simplemodal-container').css({'height':'auto'});

            $('[name="group_owner"]', $form).select2($.extend(
                Common.contactInputOptionsForSelect2(), {
                width: '268px',
                containerCss: {'margin-bottom': '5px'},
                maximumSelectionSize: 1,
                placeholder: gettext("Search user or enter email and press Enter"), // to override 'placeholder' returned by `Common.conta...`
                formatSelectionTooBig: gettext("You cannot select any more choices")
            }));

            $form.on('submit', function() {
                var group_name = $.trim($('[name="group_name"]', $form).val());
                var group_owner = $.trim($('[name="group_owner"]', $form).val());
                var $error = $('.error', $form);
                var $submitBtn = $('[type="submit"]', $form);

                if (!group_name) {
                    $error.html(gettext("Name is required.")).show();
                    return false;
                }

                $error.hide();
                Common.disableButton($submitBtn);

                groups.create({'group_name': group_name, 'group_owner': group_owner}, {
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

        exportExcel: function() {
            location.href = Common.getUrl({'name': 'sys_group_admin_export_excel'});
        },

        getNextPage: function() {
            this.initPage();
            var current_page = this.groupCollection.state.current_page;
            if (this.groupCollection.state.has_next_page) {
                this.groupCollection.getPage(current_page + 1, {
                    reset: true
                });
            }

            return false;
        },

        getPreviousPage: function() {
            this.initPage();
            var current_page = this.groupCollection.state.current_page;
            if (current_page > 1) {
                this.groupCollection.getPage(current_page - 1, {
                    reset: true
                });
            }
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
                data: {'page': this.option.page},
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

            // update the url
            var current_page = this.groupCollection.state.current_page;
            app.router.navigate('groups/?page=' + current_page);

            this.$loadingTip.hide();
            if (this.groupCollection.length > 0) {
                this.groupCollection.each(this.addOne, this);
                this.$table.show();
                this.renderPaginator();
            } else {
                this.$emptyTip.show();
            }
        },

        renderPaginator: function() {
            if (this.groupCollection.state.has_next_page) {
                this.$jsNext.show();
            } else {
                this.$jsNext.hide();
            }

            var current_page = this.groupCollection.state.current_page;
            if (current_page > 1) {
                this.$jsPrevious.show();
            } else {
                this.$jsPrevious.hide();
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

    return GroupsView;

});
