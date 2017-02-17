define([
    'jquery',
    'simplemodal',
    'underscore',
    'backbone',
    'common',
    'app/collections/repos',
    'app/views/add-pubrepo-item'
], function($, simplemodal, _, Backbone, Common,
    RepoCollection, AddPubrepoItem) {
    'use strict';

    var AddPubRepoView = Backbone.View.extend({
        id: 'add-pubrepo-popup',

        template: _.template($('#add-pubrepo-popup-tmpl').html()),

        initialize: function(pubRepos) {
            this.$el.html(this.template()).modal({focus:false});
            $('#simplemodal-container').css({'width':'auto', 'height':'auto'});

            this.$table = this.$('table');
            this.$loadingTip = this.$('.loading-tip');

            this.myRepos = new RepoCollection();
            this.pubRepos = pubRepos;

            this.listenTo(this.myRepos, 'reset', this.reset);
            this.myRepos.fetch({reset: true});
        },

        events: {
            'click .submit': 'submit'
        },

        submit: function () {
            var myRepos = this.myRepos.where({'selected':true}),
                _this = this,
                requests = [];

            _.each(myRepos, function (repo){
                var repo_id = repo.id,
                    perm = 'rw';

                if (repo.has('pub_perm')) {
                    perm = repo.get('pub_perm');
                }

                requests.push(
                    $.ajax({
                        url: Common.getUrl({'name':'shared_repos', 'repo_id': repo_id}) + '?share_type=public&permission=' + perm,
                        type: 'PUT',
                        beforeSend: Common.prepareCSRFToken,
                        dataType: 'json',
                        error: function(xhr, textStatus, errorThrown) {
                            Common.ajaxErrorHandler(xhr, textStatus, errorThrown);
                        }
                    })
                );
            })

            var defer = $.when.apply($, requests);
            defer.done(function () {
                // when all ajax request complete
                $.modal.close();
                _this.pubRepos.fetch({reset: true});
            });
        },

        addOne: function(model) {
            var view = new AddPubrepoItem({model: model});
            this.$table.append(view.render().el);
        },

        reset: function() {
            this.$loadingTip.hide();
            this.$table.show()
            this.myRepos.each(this.addOne, this);
        }

    });
    return AddPubRepoView;
});
