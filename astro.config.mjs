import { defineConfig } from 'astro/config';

export default defineConfig({
    output: 'static',
    build: {
        assets: 'assets'
    },
    server: {
        port: 3000
    }
});
