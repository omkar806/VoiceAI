#!/bin/bash

# Set terminal colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Docker Compose setup...${NC}"
docker-compose down -v
docker-compose up -d

echo -e "${BLUE}Waiting for services to be ready...${NC}"
sleep 10

echo -e "${GREEN}Running API tests...${NC}"
pip install -r requirements.txt
python test_apis.py

echo -e "${BLUE}Showing Docker logs...${NC}"
docker-compose logs app

echo -e "${GREEN}Test complete!${NC}" 