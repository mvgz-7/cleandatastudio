import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import child_process from 'child_process';
import { env } from 'process';

export default defineConfig(({ command }) => {
    // Only configure and run certificate creation during local development
    const isDev = command === 'serve';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let httpsConfig: any = false;
    let target = 'https://localhost:7281';

    if (isDev) {
        const baseFolder =
            env.APPDATA !== undefined && env.APPDATA !== ''
                ? `${env.APPDATA}/ASP.NET/https`
                : `${env.HOME}/.aspnet/https`;

        const certificateName = "cleandatastudio.client";
        const certFilePath = path.join(baseFolder, `${certificateName}.pem`);
        const keyFilePath = path.join(baseFolder, `${certificateName}.key`);

        if (!fs.existsSync(baseFolder)) {
            fs.mkdirSync(baseFolder, { recursive: true });
        }

        if (!fs.existsSync(certFilePath) || !fs.existsSync(keyFilePath)) {
            if (0 !== child_process.spawnSync('dotnet', [
                'dev-certs',
                'https',
                '--export-path',
                certFilePath,
                '--format',
                'Pem',
                '--no-password',
            ], { stdio: 'inherit', }).status) {
                throw new Error("Could not create certificate.");
            }
        }

        target = env.ASPNETCORE_HTTPS_PORT ? `https://localhost:${env.ASPNETCORE_HTTPS_PORT}` :
            env.ASPNETCORE_URLS ? env.ASPNETCORE_URLS.split(';')[0] : 'https://localhost:7281';

        // Safely assign the local filesystem keys only if we are running locally
        httpsConfig = {
            key: fs.readFileSync(keyFilePath),
            cert: fs.readFileSync(certFilePath),
        };
    }

    return {
        plugins: [plugin()],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url))
            }
        },
        // Server block configurations are completely optimized out for Vercel production
        server: isDev ? {
            proxy: {
                '/api': {
                    target: target,
                    changeOrigin: true,
                    secure: false
                }
            },
            port: parseInt(env.DEV_SERVER_PORT || '64965'),
            https: httpsConfig
        } : {}
    };
});