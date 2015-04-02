PROJECT=seahub

develop: setup-git

setup-git:
	cd .git/hooks && ln -sf ../../hooks/* ./

dist: uglify collectstatic

uglify:
	rm -rf static/scripts/dist 2> /dev/null
	r.js -o static/scripts/build.js

collectstatic:
	rm -rf media/assets 2> /dev/null
	python manage.py collectstatic --noinput
