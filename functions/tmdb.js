// EdgeOne Pages Function for TMDB API proxy
const TMDB_BASE_URL = 'https://api.themoviedb.org';

// 创建缓存对象
const cache = new Map();
// 缓存过期时间（10分钟）
const CACHE_DURATION = 10 * 60 * 1000;
// 最大缓存条目数
const MAX_CACHE_SIZE = 1000;

// 缓存清理函数
function cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now > value.expiry) {
            cache.delete(key);
        }
    }
}

// 检查缓存大小并清理最旧的条目
function checkCacheSize() {
    if (cache.size > MAX_CACHE_SIZE) {
        // 将缓存条目转换为数组并按过期时间排序
        const entries = Array.from(cache.entries());
        entries.sort((a, b) => a[1].expiry - b[1].expiry);

        // 删除最旧的条目，直到缓存大小达到限制
        const deleteCount = cache.size - MAX_CACHE_SIZE;
        entries.slice(0, deleteCount).forEach(([key]) => cache.delete(key));

        console.log(`Cleaned ${deleteCount} old cache entries`);
    }
}

// 定期清理缓存（每10分钟）
setInterval(cleanExpiredCache, CACHE_DURATION);

// EdgeOne Pages Function 主处理函数
export async function onRequest(context) {
    const { request, env } = context;
    
    // 处理 OPTIONS 请求
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }

    try {
        const url = new URL(request.url);
        const fullPath = url.pathname + url.search;
        const authHeader = request.headers.get('authorization');

        // 缓存键只使用请求路径
        const cacheKey = fullPath;

        // 检查缓存
        if (cache.has(cacheKey)) {
            const cachedData = cache.get(cacheKey);
            if (Date.now() < cachedData.expiry) {
                console.log('Cache hit:', fullPath);
                return new Response(JSON.stringify(cachedData.data), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                    }
                });
            } else {
                cache.delete(cacheKey);
            }
        }

        // 构建 TMDB 请求 URL
        const tmdbUrl = `${TMDB_BASE_URL}${fullPath}`;

        // 构建请求配置
        const fetchOptions = {
            method: request.method,
            headers: {}
        };

        // 只有在存在 Authorization header 时才添加
        if (authHeader) {
            fetchOptions.headers['Authorization'] = authHeader;
        }

        // 发送请求到 TMDB
        const response = await fetch(tmdbUrl, fetchOptions);
        const responseData = await response.json();

        // 只有响应状态码为 200 时才缓存
        if (response.status === 200) {
            // 在添加新缓存前检查缓存大小
            checkCacheSize();

            cache.set(cacheKey, {
                data: responseData,
                expiry: Date.now() + CACHE_DURATION
            });
            console.log('Cache miss and stored:', fullPath);
        } else {
            console.log('Response not cached due to non-200 status:', response.status);
        }

        // 返回响应
        return new Response(JSON.stringify(responseData), {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    } catch (error) {
        console.error('TMDB API error:', error);
        return new Response(JSON.stringify({
            error: error.message,
            details: error.response?.data || 'Unknown error'
        }), {
            status: error.response?.status || 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }
}
