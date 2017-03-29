.PHONY: build start deploy

build:
	docker-compose -f docker-compose.live.yml build

start:
	docker-compose -f docker-compose.live.yml up -d

deploy: build start
