PROJECT=seahub

develop: setup-git

setup-git:
	cd .git/hooks && ln -sf ../../hooks/* ./

dist: locale uglify statici18n collectstatic

locale:
	@echo "--> Compile locales"
	django-admin.py compilemessages
	@echo ""

uglify:
	@echo "--> Uglify JS files to static/scripts/dist"
	rm -rf static/scripts/dist 2> /dev/null
	r.js -o static/scripts/build.js

statici18n:
	@echo "--> Generate JS locale files in static/scripts/i18n"
	python manage.py compilejsi18n

collectstatic:
	@echo "--> Collect django static files to media/assets"
	rm -rf media/assets 2> /dev/null
	python manage.py collectstatic --noinput

compressstatic:
	@echo "--> Compress static files(css) to media/CACHE"
	rm -rf media/CACHE 2> /dev/null
	python manage.py compress

clean:
	@echo '--> Cleaning media/static cache & dist'
	rm -rf media/CACHE 2> /dev/null
	rm -rf media/assets 2> /dev/null
	rm -rf static/scripts/dist 2> /dev/null
	@echo ""

cleanpyc:
	@echo '--> Cleaning .pyc files'
	find . -name \*.pyc -exec rm -f {} \;
	@echo ""

.PHONY: develop setup-git dist locale uglify statici18n collectstatic compressstatic clean
