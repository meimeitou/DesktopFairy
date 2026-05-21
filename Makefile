.PHONY: dev build build-dir lint preview clean install

dev:
	npm run dev

build:
	npm run build

build-dir:
	npm run build:dir

lint:
	npm run lint

preview:
	npm run preview

clean:
	rm -rf dist release

install:
	npm install
