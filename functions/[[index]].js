/**
 * TMDB API 代理 - EdgeOne 入口点
 * TMDB API 的代理服务
 *
 * GitHub 仓库: https://github.com/imaliang/tmdb-api-proxy
 */

import {handleRequest} from '../src/core.js';

export default async function onRequest(context) {
// export function onRequest({ request }: { request: EORequest }) {
    const req = context.request;

    // 为代理创建一个合适的Request对象
    // const request = new Request(req.url, {
    //     method: req.method,
    //     headers: req.headers,
    //     body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : null
    // });
    const url = new URL(req.url);
    const targetPath = url.pathname + url.search;

    if (url.pathname === '/all') {
        return new Response(JSON.stringify({
                context: context,
                timestamp: new Date().toISOString(),
        }), {
            status: 200,
            headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
            }
        });
    }
    // 通过代理处理请求
    return await handleRequest(context.request);
}