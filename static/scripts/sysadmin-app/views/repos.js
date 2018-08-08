define([
    'jquery',
    'underscore',
    'backbone',
    'common',
    'sysadmin-app/views/repo',
    'sysadmin-app/collection/repos'
], function($, _, Backbone, Common, RepoView, RepoCollection) {
    'use strict';

    var ReposView = Backbone.View.extend({

        id: 'libraries',

        tabNavTemplate: _.template($("#libraries-tabnav-tmpl").html()),
        template: _.template($("#libraries-tmpl").html()),
        libraryAddFormtemplate: _.template($("#library-add-form-tmpl").html()),

        initialize: function() {
            this.repoCollection = new RepoCollection();
            this.listenTo(this.repoCollection, 'add', this.addOne);
            this.listenTo(this.repoCollection, 'reset', this.reset);
            this.render();
        },

        render: function() {
            var $tabnav = $(this.tabNavTemplate({'cur_tab': 'all'}));
            this.$el.append($tabnav);
            this.$el.append(this.template());

            this.$table = this.$('table');
            this.$tableBody = $('tbody', this.$table);
            this.$loadingTip = this.$('.loading-tip');
            this.$emptyTip = this.$('.empty-tips');
            this.$jsPrevious = this.$('.js-previous');
            this.$jsNext = this.$('.js-next');
        },

        events: {
            'click .js-add-library': 'addLibrary',
            'click #paginator .js-next': 'getNextPage',
            'click #paginator .js-previous': 'getPreviousPage'
        },

        addLibrary: function () {
            var $form = $(this.libraryAddFormtemplate()),
                repos = this.repoCollection,
                _this = this;

            $form.modal();
            $('#simplemodal-container').css({'height':'auto'});

            $('[name="library_owner"]', $form).select2($.extend(
                Common.contactInputOptionsForSelect2(), {
                width: '268px',
                containerCss: {'margin-bottom': '5px'},
                maximumSelectionSize: 1,
                placeholder: gettext("Search user or enter email and press Enter"), // to override 'placeholder' returned by `Common.conta...`
                formatSelectionTooBig: gettext("You cannot select any more choices")
            }));

            $form.on('submit', function() {
                var library_name = $.trim($('[name="library_name"]', $form).val());
                var library_owner = $.trim($('[name="library_owner"]', $form).val());
                var $error = $('.error', $form);
                var $submitBtn = $('[type="submit"]', $form);

                if (!library_name) {
                    $error.html(gettext("Name is required.")).show();
                    return false;
                }

                $error.hide();
                Common.disableButton($submitBtn);

                repos.create({'name': library_name, 'owner': library_owner}, {
                    prepend: true,
                    wait: true,
                    success: function() {
                        if (repos.length == 1) {
                            repos.reset(repos.models);
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

        initPage: function() {
            this.$table.hide();
            this.$tableBody.empty();
            this.$loadingTip.show();
            this.$emptyTip.hide();
            this.$jsNext.hide();
            this.$jsPrevious.hide();
        },

        getNextPage: function() {
            this.initPage();
            var current_page = this.repoCollection.state.current_page;
            if (this.repoCollection.state.has_next_page) {
                this.repoCollection.getPage(current_page + 1, {
                    reset: true
                });
            }

            return false;
        },

        getPreviousPage: function() {
            this.initPage();
            var current_page = this.repoCollection.state.current_page;
            if (current_page > 1) {
                this.repoCollection.getPage(current_page - 1, {
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
            this.repoCollection.fetch({
                data: {'page': this.option.page},
                cache: false,
                reset: true,
                error: function(collection, response, opts) {
                    var err_msg = Common.prepareCollectionFetchErrorMsg(collection, response, opts);
                    Common.feedback(err_msg, 'error');
                },
                complete:function() {
                    _this.$loadingTip.hide();
                }
            });
        },

        reset: function() {
            // update the url
            var current_page = this.repoCollection.state.current_page;
            app.router.navigate('all-libs/?page=' + current_page);

            this.$loadingTip.hide();
            if (this.repoCollection.length > 0) {
                this.repoCollection.each(this.addOne, this);
                this.$table.show();
                this.renderPaginator();
            } else {
                this.$emptyTip.show();
            }
        },

        renderPaginator: function() {
            if (this.repoCollection.state.has_next_page) {
                this.$jsNext.show();
            } else {
                this.$jsNext.hide();
            }

            var current_page = this.repoCollection.state.current_page;
            if (current_page > 1) {
                this.$jsPrevious.show();
            } else {
                this.$jsPrevious.hide();
            }
        },

        addOne: function(library, collection, options) {
            var view = new RepoView({model: library});
            if (options.prepend) {
                this.$tableBody.prepend(view.render().el);
            } else {
                this.$tableBody.append(view.render().el);
            }
        }
    });

    return ReposView;

});
