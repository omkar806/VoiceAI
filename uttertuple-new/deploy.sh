#!/bin/bash

# Authtuple deploy.sh
# Usage:
# ./deploy.sh fetch_latest_changes main
# ./deploy.sh deploy_ci main

PROJECT_NAME="uttertuple_main"

fetch_latest_changes(){
    cd /opt/uttertuple_dev/uttertuple-new
    echo "[DEPLOY] Configuring Git user..."
    git config user.email "deploy@deploy.com"
    git config user.name "deploy"

    # Mark the directory as safe to avoid dubious ownership error
    git config --global --add safe.directory /opt/uttertuple_dev/uttertuple-new

    echo "[DEPLOY] Pulling latest changes from branch: $1"
    git pull origin $1
}

deploy_ci(){
    echo "[DEPLOY] Deploying project: $PROJECT_NAME on branch $1"

    # Only rebuild without stopping existing containers
    docker compose --project-name $PROJECT_NAME \
                   -f docker-compose.yml \
                   up -d --build

    echo "[CLEANUP] Cleaning old images (10 days or older)..."
    docker builder prune -f --filter until=240h
    docker buildx prune -f --filter until=240h
    docker image prune -a -f
}

"$@"