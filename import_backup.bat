@echo off
echo Stopping the python app container to prevent SQLAlchemy auto-generation...
docker compose stop app

echo Dropping any existing dewshare database and recreating it cleanly...
docker compose exec -T dewshare-db psql -U dew -d postgres -c "DROP DATABASE IF EXISTS dewshare (FORCE);"
docker compose exec -T dewshare-db psql -U dew -d postgres -c "CREATE DATABASE dewshare OWNER dew;"

echo Copying backup.sql into the container...
docker compose cp backup.sql dewshare-db:/tmp/backup.sql

echo Importing backup.sql - this may take a moment based on file size...
docker compose exec -T dewshare-db psql -U dew -d dewshare -f /tmp/backup.sql

echo Cleaning up temp file...
docker compose exec -T dewshare-db rm /tmp/backup.sql

echo Restarting the application stack...
docker compose up -d

echo Import Complete!
