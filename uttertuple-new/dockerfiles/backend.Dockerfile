FROM python:3.11.6
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
COPY ./src/backend/requirements.txt /app/requirements.txt
# RUN pip install --disable-pip-version-check --no-cache-dir --no-input uv &&  uv pip install --no-cache -r /app/requirements.in
# COPY ./bot_service/src/backend/requirements.txt /app/requirements.txt
RUN pip install --disable-pip-version-check --no-cache-dir --no-input --requirement /app/requirements.txt
RUN apt-get update -y \
    && apt-get install curl unixodbc docker.io -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY ./src/backend /app/backend
WORKDIR /app/backend
# RUN echo "Applying database migrations ..." && alembic upgrade head

USER root
CMD ["/bin/bash", "-c", "python3 main.py"]