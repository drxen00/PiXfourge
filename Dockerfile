FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    binwalk \
    radare2 \
    git \
    make \
    && rm -rf /var/lib/apt/lists/*

# Node 22 for the command-line builder (scripts/build_3.0.1_0.js, standard library only)
COPY --from=node:22-slim /usr/local/bin/node /usr/local/bin/node

WORKDIR /workspace

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["make", "all"]
