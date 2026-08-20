# 悟道本地数据

运行 `npm run local:start` 后，数据库与上传图片会持久保存在 `data/runtime/`。

- 启动：`npm run local:start`
- 备份：先停止本地服务，再运行 `npm run local:backup`
- 恢复：先停止本地服务，再运行 `npm run local:restore -- /备份文件路径.tar.gz`

`runtime/`、`backups/` 与 `.env.local` 均不会提交到 GitHub。请同时妥善保管 `.env.local`；丢失其中的 `MODEL_KEYS_MASTER_KEY` 后，数据库内已加密的模型 API Key 将无法解密。
