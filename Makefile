PROJECT=seahub

develop: setup-git

setup-git:
	cd .git/hooks && ln -sf ../../hooks/* ./

dist: uglify collectstatic compressstatic

uglify:
	@echo "--> Uglify JS files to static/scripts/dist"
	rm -rf static/scripts/dist 2> /dev/null
	r.js -o static/scripts/build.js

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
