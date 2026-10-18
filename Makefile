test:
	cd back && go test ./...
	cd front && bun run test

test-back:
	cd back && go test ./...

test-front:
	cd front && bun run test

test-watch-front:
	cd front && bun run test:watch

test-verbose:
	cd back && go test -v -count=1 ./...

build-back:
	cd back && CGO_ENABLED=0 go build -tags nomsgpack -trimpath -ldflags="-s -w" -o choons ./cmd/choons

run-back:
	cd back && go run -tags nomsgpack ./cmd/choons
