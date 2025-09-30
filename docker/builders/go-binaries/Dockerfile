FROM golang:1.22-alpine

ENV CGO_ENABLED=0

WORKDIR /workspace

RUN cat <<'EOF' >/usr/local/bin/build-go-binary
#!/bin/sh
set -e

if [ -z "$MODULE_DIR" ]; then
  echo "MODULE_DIR environment variable is required" >&2
  exit 1
fi

if [ -z "$OUTPUT" ]; then
  echo "OUTPUT environment variable is required" >&2
  exit 1
fi

package="${PACKAGE:-./...}"
module_dir="/workspace/$MODULE_DIR"
output_path="/workspace/$OUTPUT"

if [ ! -d "$module_dir" ]; then
  echo "Module directory $module_dir does not exist" >&2
  exit 1
fi

cd "$module_dir"

go mod tidy

output_dir=$(dirname "$output_path")
mkdir -p "$output_dir"

go build -o "$output_path" "$package"
EOF

RUN chmod +x /usr/local/bin/build-go-binary

ENTRYPOINT ["/usr/local/bin/build-go-binary"]
