ARG COMFYUI_REPO="https://github.com/comfyanonymous/ComfyUI.git"
ARG COMFYUI_REF="master"
ARG COMFYUI_API_REPO="https://github.com/saladtechnologies/comfyui-api.git"
ARG COMFYUI_API_REF="main"

FROM nvidia/cuda:11.8.0-cudnn8-devel-ubuntu22.04 AS build

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_PREFER_BINARY=1 \
    CMAKE_BUILD_PARALLEL_LEVEL=8 \
    COMFY_HOME=/opt/ComfyUI \
    MODEL_DIR=/opt/ComfyUI/models \
    INPUT_DIR=/opt/ComfyUI/input \
    OUTPUT_DIR=/opt/ComfyUI/output \
    WORKFLOW_DIR=/workflows \
    CMD="/bin/true" \
    PYTHONUNBUFFERED=1 \
    TORCH_CUDA_ARCH_LIST="6.1" \
    FORCE_CUDA=1 \
    PYTORCH_NVFUSER_DISABLE=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        git \
        curl \
        python3 \
        python3-pip \
        python3-venv \
        python3-dev \
        python-is-python3 \
        procps \
        libgl1 \
        libglib2.0-0 \
        pkg-config \
        libjpeg-dev \
        zlib1g-dev \
        libpng-dev \
        libwebp-dev \
        libcairo2 \
        cmake \
        ninja-build \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* /etc/apt/sources.list.d/nodesource.list

RUN python3 -m venv "${VIRTUAL_ENV}"

RUN pip install --upgrade pip setuptools wheel

RUN pip install --no-cache-dir \
      --extra-index-url https://download.pytorch.org/whl/cu118 \
      torch==2.3.1+cu118 \
      torchvision==0.18.1+cu118 \
      torchaudio==2.3.1+cu118

RUN pip install --no-cache-dir --no-build-isolation \
      --extra-index-url https://download.pytorch.org/whl/cu118 \
      xformers==0.0.27.post2

RUN git clone --depth 1 --branch "${COMFYUI_REF}" "${COMFYUI_REPO}" "${COMFY_HOME}"

WORKDIR ${COMFY_HOME}

RUN sed -i '/^torch==/d' requirements.txt \
    && sed -i '/^torchvision==/d' requirements.txt \
    && sed -i '/^torchaudio==/d' requirements.txt \
    && sed -i '/^xformers==/d' requirements.txt

RUN pip install --no-cache-dir --no-deps -r requirements.txt

RUN mkdir -p "${MODEL_DIR}" "${INPUT_DIR}" "${OUTPUT_DIR}" "${WORKFLOW_DIR}"

WORKDIR /opt

RUN git clone --depth 1 --branch "${COMFYUI_API_REF}" "${COMFYUI_API_REPO}" /opt/comfyui-api

WORKDIR /opt/comfyui-api

RUN npm ci \
    && npm run build \
    && npm prune --production

FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_PREFER_BINARY=1 \
    CMAKE_BUILD_PARALLEL_LEVEL=8 \
    COMFY_HOME=/opt/ComfyUI \
    MODEL_DIR=/opt/ComfyUI/models \
    INPUT_DIR=/opt/ComfyUI/input \
    OUTPUT_DIR=/opt/ComfyUI/output \
    WORKFLOW_DIR=/workflows \
    CMD="/bin/true" \
    PYTHONUNBUFFERED=1 \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    TORCH_CUDA_ARCH_LIST="6.1" \
    PYTORCH_NVFUSER_DISABLE=1 \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility \
    LD_LIBRARY_PATH=/usr/local/nvidia/lib:/usr/local/nvidia/lib64

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 \
        python3-venv \
        python-is-python3 \
        python3-pip \
        libgl1 \
        libglib2.0-0 \
        libcairo2 \
        git \
        curl \
        procps \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* /etc/apt/sources.list.d/nodesource.list

COPY --from=build /opt/venv /opt/venv
COPY --from=build /opt/ComfyUI /opt/ComfyUI
COPY --from=build /opt/comfyui-api /opt/comfyui-api

COPY comfyui-api-entrypoint.sh /usr/local/bin/comfyui-api-entrypoint.sh
COPY comfyui-launch.sh /usr/local/bin/comfyui-launch.sh

RUN chmod +x /usr/local/bin/comfyui-api-entrypoint.sh /usr/local/bin/comfyui-launch.sh

WORKDIR ${COMFY_HOME}

EXPOSE 8188

ENTRYPOINT ["/usr/local/bin/comfyui-api-entrypoint.sh"]
CMD ["node", "/opt/comfyui-api/dist/src/index.js"]
