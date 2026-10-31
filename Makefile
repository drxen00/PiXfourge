.PHONY: all extract diff clean cfw site check test

# Reverse-engineering workflow from the original project (needs the older firmware files in firmware/)
all: extract diff

extract:
	python3 scripts/extract.py firmware/v0.2.5_0.5.lcd
	python3 scripts/extract.py firmware/v0.3.0_0.7.lcd

diff:
	python3 scripts/diff_mcu.py firmware/v0.2.5_0.5.lcd firmware/v0.3.0_0.7.lcd

cfw:
	node scripts/build_3.0.1_0.js

# The Pi-Xfourge page: rebuild index.html, run the static checks, run the browser test
# (`make test` uses a synthetic firmware file; `make test BETA=path/to/v0.2.9_3.1_cspx4.lcd` uses the real one)
site:
	python3 site/build.py

check:
	node tests/check-static.cjs
	python3 site/build.py --check

test:
	node tests/verify-site.cjs $(BETA)

clean:
	rm -rf extracted/*.bin
