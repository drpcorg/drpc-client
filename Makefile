test:
	npx jest tests/unit/*.spec.ts

RUN_INTEGRATIONS_NODE = npx jest tests/integration/*.spec.ts
RUN_INTEGRATIONS_NODE_ARGS = --watch
ifeq ($(NOWATCH), true)
	RUN_INTEGRATIONS_NODE_ARGS =
endif
integration-node:
	$(RUN_INTEGRATIONS_NODE) $(RUN_INTEGRATIONS_NODE_ARGS)

integration-snap:
	$(RUN_INTEGRATIONS_NODE) -- -u

KARMA_CONFIG=./karma.config.cjs
ifeq ($(NOWATCH), true)
	KARMA_CONFIG = ./karma.config-single.cjs
endif
integration-browser:
	npx karma start $(KARMA_CONFIG)

build: clean
	npx tsc -p ./tsconfig.json --outDir ./build

clean:
	rm -rf ./build

run-publish: test integration-node integration-browser clean build
	npm publish

publish:
	$(MAKE) run-publish NOWATCH=true
