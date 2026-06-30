.DEFAULT_GOAL := help

# make dev: open Electron DevTools in a separate window by default
DEVTOOLS ?= 1
DEVTOOLS_MODE ?= detach

.PHONY: help dev dev-quiet build build-dir lint preview clean install

help: ## Show available targets
	@echo "DesktopFairy — available targets:"
	@echo ""
	@grep -E '^[a-zA-Z0-9_-]+:.*?(## .*$$)?$$' $(MAKEFILE_LIST) | grep -v '^help:' | awk 'BEGIN {FS = ":.*?## "}; /^[a-zA-Z0-9_-]+:/{ if (NF==2) printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2; else printf "  \033[36m%-12s\033[0m\n", $$1 }'
	@echo ""
	@echo "Dev options (make dev):"
	@echo "  DEVTOOLS=1|0          Open DevTools (default: $(DEVTOOLS))"
	@echo "  DEVTOOLS_MODE=detach  detach | right | bottom | undocked (default: $(DEVTOOLS_MODE))"
	@echo "  ELECTRON_HOT_RELOAD=0 Disable main-process hot-reload (default: on in dev)"

install: ## Install npm dependencies
	npm install

dev: ## Start dev (Vite + Electron); DevTools detached by default
	ELECTRON_OPEN_DEVTOOLS=$(DEVTOOLS) ELECTRON_DEVTOOLS_MODE=$(DEVTOOLS_MODE) npm run dev

dev-quiet: ## Start dev without opening DevTools
	$(MAKE) dev DEVTOOLS=0

build: ## Production build (dmg installer)
	npm run build

build-dir: ## Build app directory only (faster, for testing)
	npm run build:dir

build-adhoc: ## Build ad-hoc signed DMG (no Apple Developer account needed)
	CSC_IDENTITY_AUTO_DISCOVERY=false npm run build:dir
	codesign --deep --force --sign - --entitlements build/entitlements.mac.plist release/mac-arm64/DesktopFairy.app
	hdiutil create -volname DesktopFairy -srcfolder release/mac-arm64/DesktopFairy.app \
		-ov -format UDZO release/DesktopFairy-adhoc.dmg
	@echo "DMG: release/DesktopFairy-adhoc.dmg"

lint: ## Run ESLint
	npm run lint

preview: ## Preview production build
	npm run preview

clean: ## Remove dist/ and release/
	rm -rf dist release
