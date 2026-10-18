FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -tags nomsgpack -trimpath -ldflags="-s -w" -o /out/choons ./cmd/choons

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/choons /choons
ENV GOMEMLIMIT=96MiB GIN_MODE=release
EXPOSE 8080
USER nonroot:nonroot
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD ["/choons", "health"]
ENTRYPOINT ["/choons"]
