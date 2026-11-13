# SAM build — bundles each function entry with esbuild.
build-ApiFunction:
	cd $(ARTIFACTS_DIR)/$(SERVICE_NAME)/$(FUNCTION_NAME) && npm install && npm run build:lambda

build-SweeperFunction:
	cd $(ARTIFACTS_DIR)/$(SERVICE_NAME)/$(FUNCTION_NAME) && npm install && npm run build:sweeper
