/**
 * TMDB API 代理 - 核心逻辑
 * EdgeOne 部署的核心功能
 */

const TMDB_BASE_URL = 'https://api.themoviedb.org';
const REQUEST_TIMEOUT = 30000; // 30秒超时

/**
 * 创建一个在指定毫秒后拒绝的超时Promise
 */
function createTimeoutPromise(ms) {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), ms);
    });
}

/**
 * 从一个Headers对象复制到另一个，排除某些指定的请求头
 */
function copyHeaders(sourceHeaders, excludeHeaders = []) {
    const headers = new Headers();
    const excludeSet = new Set(excludeHeaders.map(h => h.toLowerCase()));

    for (const [key, value] of sourceHeaders.entries()) {
        if (!excludeSet.has(key.toLowerCase())) {
            headers.set(key, value);
        }
    }

    return headers;
}

/**
 * TMDB API 代理的主要请求处理器
 */
export async function handleRequest(request) {
    try {
        const url = new URL(request.url);
        const targetPath = url.pathname + url.search;

        // 健康检查端点
        if (url.pathname === '/health' || url.pathname === '/ping') {
            return new Response(JSON.stringify({
                status: 'ok',
                service: 'TMDB API 代理',
                timestamp: new Date().toISOString(),
                target: TMDB_BASE_URL
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        const targetUrl = TMDB_BASE_URL + targetPath;

        // 记录请求用于调试（开发环境）
        console.log(`代理请求 ${request.method} ${targetPath}`);

        // 复制请求头，排除host和一些边缘计算特定的请求头
        const requestHeaders = copyHeaders(request.headers, [
            'host',
            'cf-ray',
            'cf-connecting-ip',
            'cf-visitor',
            'x-forwarded-for',
            'x-forwarded-proto',
            'x-real-ip',
            'connection',
            'upgrade'
        ]);

        // 为TMDB API设置正确的host请求头
        requestHeaders.set('Host', 'api.themoviedb.org');

        // 准备请求选项
        const requestOptions = {
            method: request.method,
            headers: requestHeaders,
        };

        // 为非GET/HEAD请求添加请求体
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            requestOptions.body = request.body;
        }

        // 创建带超时的代理请求
        const fetchPromise = fetch(targetUrl, requestOptions);
        const timeoutPromise = createTimeoutPromise(REQUEST_TIMEOUT);

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        // 复制响应头
        const responseHeaders = copyHeaders(response.headers);

        // 添加CORS头以支持浏览器兼容性
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Language');
        responseHeaders.set('Access-Control-Max-Age', '86400'); // 24小时

        // 处理预检OPTIONS请求
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: responseHeaders
            });
        }

        // 返回代理后的响应
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });

    } catch (error) {
        console.error('代理错误:', error);

        // 处理不同类型的错误
        if (error.message === 'Request timeout') {
            return new Response(JSON.stringify({
                success: false,
                status_code: 504,
                status_message: '网关超时 - TMDB API 请求超时'
            }), {
                status: 504,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // 网络或其他错误
        return new Response(JSON.stringify({
            success: false,
            status_code: 502,
            status_message: '网关错误 - 无法连接到 TMDB API'
        }), {
            status: 502,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}