# Docker 部署说明

这个前端项目是 Vite 单页应用。Docker 镜像会先构建前端静态文件，再用 Caddy 对外提供访问，并把 `/api` 请求转发到后端。

## 关键说明

前端代码里的接口路径已经包含 `/api/v1`，例如：

```text
/api/v1/auth/login
```

所以构建时 `VITE_API_BASE_URL` 应该设置为 `/`，不要设置成 `/api`。

如果设置成 `/api`，最终请求会变成：

```text
/api/api/v1/auth/login
```

这会导致接口地址错误。

## 前置条件

- 云服务器已经安装 Docker。
- 后端服务已经启动，例如监听在 `8091` 端口。
- 云服务器安全组或防火墙已开放 `80` 端口。
- 如果后端和前端不在同一台机器上，需要确认前端容器能访问后端地址。

## 构建镜像

在 `idea-island-frontend/` 目录执行。

Windows PowerShell 推荐直接复制这一行：

```powershell
docker build --build-arg VITE_API_BASE_URL=/ --build-arg VITE_USE_MOCK=false -t idea-island-frontend .
```

Linux/macOS：

```bash
docker build \
  --build-arg VITE_API_BASE_URL=/ \
  --build-arg VITE_USE_MOCK=false \
  -t idea-island-frontend .
```

说明：

- `VITE_API_BASE_URL=/`：浏览器请求 `/api/v1/...`。
- `VITE_USE_MOCK=false`：关闭前端 mock，使用真实后端接口。
- Caddy 会把 `/api/*` 转发到后端服务。

## 启动容器

如果后端运行在同一台云服务器宿主机，并监听 `8091` 端口。

Windows PowerShell 推荐直接复制这一行：

```powershell
docker run -d --name idea-island-frontend -p 80:80 --add-host=host.docker.internal:host-gateway -e API_UPSTREAM=host.docker.internal:8091 idea-island-frontend
```

Linux/macOS：

```bash
docker run -d \
  --name idea-island-frontend \
  -p 80:80 \
  --add-host=host.docker.internal:host-gateway \
  -e API_UPSTREAM=host.docker.internal:8091 \
  idea-island-frontend
```

启动后访问：

```text
http://你的服务器IP
```

## 80 端口被占用时

如果 `80` 端口已经被占用，可以换成其他端口，例如 `5175`。

Windows PowerShell：

```powershell
docker run -d --name idea-island-frontend -p 5175:80 --add-host=host.docker.internal:host-gateway -e API_UPSTREAM=host.docker.internal:8091 idea-island-frontend
```

然后访问：

```text
http://你的服务器IP:5175
```

## 后端也在 Docker 里时

如果后端也通过 Docker 运行，建议让前端和后端加入同一个 Docker 网络。

先创建网络：

```bash
docker network create idea-island
```

启动前端容器时指定后端容器名。

Windows PowerShell：

```powershell
docker run -d --name idea-island-frontend --network idea-island -p 80:80 -e API_UPSTREAM=idea-island-backend:8091 idea-island-frontend
```

Linux/macOS：

```bash
docker run -d \
  --name idea-island-frontend \
  --network idea-island \
  -p 80:80 \
  -e API_UPSTREAM=idea-island-backend:8091 \
  idea-island-frontend
```

注意：后端容器也必须加入 `idea-island` 网络，并且容器名需要和 `API_UPSTREAM` 中的 `idea-island-backend` 一致。

## 更新部署

每次前端代码更新后，重新构建镜像并重启容器。

Windows PowerShell：

```powershell
docker build --build-arg VITE_API_BASE_URL=/ --build-arg VITE_USE_MOCK=false -t idea-island-frontend .
docker rm -f idea-island-frontend
docker run -d --name idea-island-frontend -p 80:80 --add-host=host.docker.internal:host-gateway -e API_UPSTREAM=host.docker.internal:8091 idea-island-frontend
```

Linux/macOS：

```bash
docker build \
  --build-arg VITE_API_BASE_URL=/ \
  --build-arg VITE_USE_MOCK=false \
  -t idea-island-frontend .

docker rm -f idea-island-frontend

docker run -d \
  --name idea-island-frontend \
  -p 80:80 \
  --add-host=host.docker.internal:host-gateway \
  -e API_UPSTREAM=host.docker.internal:8091 \
  idea-island-frontend
```

## 常用检查命令

查看容器是否运行：

```bash
docker ps
```

查看前端容器日志：

```bash
docker logs idea-island-frontend
```

检查前端页面：

```bash
curl http://127.0.0.1
```

检查接口代理：

```bash
curl http://127.0.0.1/api/v1/health
```

如果 `/api` 请求失败，优先检查：

- 后端服务是否已经启动。
- 后端端口是否是 `8091`。
- `API_UPSTREAM` 是否写对。
- 如果后端在宿主机，启动前端容器时是否加了 `--add-host=host.docker.internal:host-gateway`。
- 云服务器安全组是否开放了访问端口。
