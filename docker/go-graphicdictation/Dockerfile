# syntax=docker/dockerfile:1.7

ARG OPENCV_VERSION=4.10.0

FROM golang:1.22.5-bookworm AS deps

ARG OPENCV_VERSION

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        build-essential \
        pkg-config \
        cmake \
        git \
        python3 \
        python3-dev \
        python3-numpy \
        libgtk-3-dev \
        libcanberra-gtk3-dev \
        libtbb-dev \
        libjpeg62-turbo-dev \
        libpng-dev \
        libtiff-dev \
        libwebp-dev \
        libavcodec-dev \
        libavformat-dev \
        libswscale-dev \
        libswresample-dev \
        libavutil-dev \
        liblapack-dev \
        gfortran \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp/opencv

RUN set -eux; \
    git clone --depth 1 --branch ${OPENCV_VERSION} https://github.com/opencv/opencv.git opencv-${OPENCV_VERSION}; \
    git clone --depth 1 --branch ${OPENCV_VERSION} https://github.com/opencv/opencv_contrib.git opencv_contrib-${OPENCV_VERSION}; \
    mkdir -p opencv-${OPENCV_VERSION}/build

WORKDIR /tmp/opencv/opencv-${OPENCV_VERSION}/build

RUN cmake -D CMAKE_BUILD_TYPE=Release \
          -D CMAKE_INSTALL_PREFIX=/usr/local \
          -D OPENCV_GENERATE_PKGCONFIG=ON \
          -D OPENCV_EXTRA_MODULES_PATH=/tmp/opencv/opencv_contrib-${OPENCV_VERSION}/modules \
          -D BUILD_DOCS=OFF \
          -D BUILD_TESTS=OFF \
          -D BUILD_PERF_TESTS=OFF \
          -D BUILD_EXAMPLES=OFF \
          -D WITH_GSTREAMER=OFF \
          -D WITH_FFMPEG=ON \
          -D WITH_TBB=ON \
          -D WITH_OPENGL=OFF \
          .. \
    && make -j"$(nproc)" \
    && make install \
    && ldconfig \
    && cd / && rm -rf /tmp/opencv

ENV CGO_CPPFLAGS="-I/usr/local/include"
ENV CGO_LDFLAGS="-L/usr/local/lib"
ENV PKG_CONFIG_PATH="/usr/local/lib/pkgconfig"

WORKDIR /src

COPY app/server/generators/graphicdictation/go.mod ./
COPY app/server/generators/graphicdictation/go.sum ./
RUN go mod download

FROM deps AS check

COPY app/server/generators/graphicdictation/ ./

RUN set -eux; \
    files="$(gofmt -l .)"; \
    if [ -n "${files}" ]; then \
        printf 'gofmt found unformatted files:\n%s\n' "$files"; \
        exit 1; \
    fi

FROM deps AS app

COPY app/server/generators/graphicdictation/ ./

RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build \
    -o /out/graphicdictation \
    ./cmd/worker

FROM debian:bookworm-slim AS runtime

ARG OPENCV_VERSION

ENV DEBIAN_FRONTEND=noninteractive
ENV CGO_ENABLED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        libgtk-3-0 \
        libtbb12 \
        libjpeg62-turbo \
        libpng16-16 \
        libtiff6 \
        libwebp7 \
        libavcodec59 \
        libavformat59 \
        libswscale6 \
        libswresample4 \
        libavutil57 \
        libgomp1 \
        libsm6 \
        libxext6 \
        libxrender1 \
        python3 \
        python3-numpy \
    && rm -rf /var/lib/apt/lists/*

COPY --from=app /usr/local /usr/local

RUN ldconfig

WORKDIR /app

COPY --from=app /out/graphicdictation /usr/local/bin/graphicdictation

ENTRYPOINT ["/usr/local/bin/graphicdictation"]
