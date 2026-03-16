FROM python:3.11-slim

WORKDIR /app

# Install required dependencies
RUN apt-get update && apt-get install -y \
    netcat-openbsd \
    postgresql-client \
    && apt-get clean

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create startup script with simple database check and migration
RUN echo '#!/bin/bash\n\
\n\
# Use environment variables directly\n\
DB_HOST=${DB_HOST:-postgres}\n\
DB_PORT=${DB_PORT:-5432}\n\
DB_USER=${DB_USER:-postgres}\n\
DB_PASSWORD=${DB_PASSWORD:-postgres}\n\
DB_NAME=${DB_NAME:-authtuple}\n\
\n\
echo "Database connection info:"\n\
echo "Host: $DB_HOST"\n\
echo "Port: $DB_PORT"\n\
echo "User: $DB_USER"\n\
echo "Database: $DB_NAME"\n\
\n\
echo "Waiting for PostgreSQL server at $DB_HOST:$DB_PORT..."\n\
# Check database connection\n\
until nc -z $DB_HOST $DB_PORT; do\n\
  echo "PostgreSQL server is unavailable - sleeping"\n\
  sleep 2\n\
done\n\
\n\
echo "PostgreSQL server is up - checking database connection"\n\
\n\
# Try to connect to postgres database\n\
until PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "\\q" 2>/dev/null; do\n\
  echo "Cannot connect to PostgreSQL yet - waiting"\n\
  sleep 2\n\
done\n\
\n\
# Check if database exists, if not, create it\n\
if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then\n\
  echo "Creating database $DB_NAME"\n\
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"\n\
else\n\
  echo "Database $DB_NAME already exists"\n\
fi\n\
\n\
# Set DATABASE_URI for Alembic to use\n\
export DATABASE_URI="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"\n\
\n\
echo "Running database migrations"\n\
alembic upgrade head\n\
\n\
echo "Starting application..."\n\
uvicorn app.main:app --host 0.0.0.0 --port 8021\n\
' > /app/start.sh

# Make script executable
RUN chmod +x /app/start.sh

# Expose the port the app runs on
EXPOSE 8021

# Command to run the application
CMD ["/app/start.sh"] 