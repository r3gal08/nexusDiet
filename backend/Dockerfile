# Note: Consider using a "distroless" image. This would allow the go to run as a non-root user
# Build Stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git for downloading dependencies (optional but good practice)
RUN apk add --no-cache git

# Copy dependency files first and download to cache
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build the application
# CGO_ENABLED=0 builds a statically-linked binary, which is much more secure and portable
# -ldflags="-w -s" strips debugging symbols to reduce binary size
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /go/bin/tracker ./cmd/tracker

# Final Stage (Minimal Image)
FROM alpine:latest

WORKDIR /app

# Install CA certificates in case the Go app needs to make external HTTPS requests
RUN apk --no-cache add ca-certificates tzdata

# Copy the built binary from the builder stage
COPY --from=builder /go/bin/tracker /app/tracker

# Expose the port the app listens on
EXPOSE 3000

# Run the binary
CMD ["/app/tracker"]
