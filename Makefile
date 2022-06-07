.PHONY: test
test:
	npm test

.PHONY: integration
integration:
	npm run itest

.PHONY: integration-browser
integration-browser:
	npm run karma

.PHONY: integration-snap
integration-snap:
	npm run itest -- -u

.PHONY: build
build:
	npm run build
