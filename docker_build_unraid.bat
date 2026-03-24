git pull
docker desktop start
docker-compose --context unraid -f docker-compose.yml -f docker-compose.prod.yml up --build
pause