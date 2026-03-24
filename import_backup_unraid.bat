@echo off
:: Define the context and files once
set CTX=--context unraid
set FILES=-f docker-compose.yml -f docker-compose.prod.yml

:: Using the actual container name from your logs
set DB_CONTAINER=dewrito-vault-dewshare-db-1

echo [1/6] Stopping app on Unraid...
docker %CTX% compose %FILES% stop app

echo [2/6] Recreating database 'dewshare'...
:: Removed -T, using -i for script-friendly execution
docker %CTX% exec -i %DB_CONTAINER% psql -U dew -d postgres -c "DROP DATABASE IF EXISTS dewshare WITH (FORCE);"
docker %CTX% exec -i %DB_CONTAINER% psql -U dew -d postgres -c "CREATE DATABASE dewshare OWNER dew;"

echo [3/6] Sending backup.sql to Unraid container...
docker %CTX% cp backup.sql %DB_CONTAINER%:/tmp/backup.sql

echo [4/6] Running the import...
docker %CTX% exec -i %DB_CONTAINER% psql -U dew -d dewshare -f /tmp/backup.sql

echo [5/6] Cleaning up remote temp files...
docker %CTX% exec -i %DB_CONTAINER% rm /tmp/backup.sql

echo [6/6] Starting stack...
docker %CTX% compose %FILES% up -d

echo Done!
pause