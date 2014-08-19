casper.test.begin('Add Library and remove library well', 7, function suite(test) {
  //CSS3 selector since we running under phantomjs which is using WebKit inside
  //document.querySelector

  casper.start('http://127.0.0.1:8000/accounts/login', function() {
    test.assertExists('form', 'login form is found');
    this.fill('form', {
      username: 'test@test.com',
      password: 'testtest'
    }, true);
  });
  casper.then(function() {
    test.assertUrlMatch(/home\/my\/$/, 'redirect url is at home page');
    this.click('#repo-create');
    test.assertExists('form#repo-create-form', 'repo create form is found');
    this.fill('form#repo-create-form', {
      repo_name: 'Test Repo',
      repo_desc: 'Test Desc'
    }, false);
    this.click('form#repo-create-form input.submit');
    this.waitWhileVisible('form#repo-create-form');
    this.reload();
  });
  casper.wait(500, function() {
  });
  casper.then(function() {
    test.assertExists('table.repo-list tr:nth-child(2)');
    test.assertSelectorHasText('table.repo-list tr:nth-child(2) td:nth-child(2) a', 'Test Repo');
    this.mouse.move('table.repo-list tr:nth-child(2) td:last-child div');
    this.captureSelector('table.png', 'table.repo-list');
    //TODO fix this
    //this.waitUntilVisible('table.repo-list tr:nth-child(2) td:last-child span:nth-child(2)');
    this.click('table.repo-list tr:nth-child(2) td:last-child span:nth-child(2)');
    test.assertExists('table.repo-list tr:nth-child(2) .op-confirm');
    this.click('table.repo-list tr:nth-child(2) .op-confirm button.yes');
    this.waitWhileVisible('table.repo-list tr:nth-child(2) .op-confirm');
    this.reload();
  });
  casper.wait(500, function() {
  });
  casper.then(function() {
    test.assertSelectorDoesntHaveText('table.repo-list tr:nth-child(2) td:nth-child(2) a', 'Test Repo');
  });
  casper.run(function() {
    test.done();
  });

});
