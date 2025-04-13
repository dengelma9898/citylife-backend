# citylife-backend

Docker Build:
`docker buildx build --platform linux/amd64 -t dengelma/nuernbergspots --push .`

How to replace image on server
1. `ssh root@87.106.208.51`
1. `docker stop nuernbergspots`
2. `docker rm nuernbergspots`
3. `docker pull dengelma/nuernbergspots`
4. `docker run -d   --name nuernbergspots   -p 3000:3000   --restart unless-stopped   dengelma/nuernbergspots`