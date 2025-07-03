#!/bin/bash

# EdgeOne Pages 部署脚本
# 使用方法: ./deploy-edgeone.sh

echo "🚀 开始部署到 EdgeOne Pages..."

# 检查必要文件
if [ ! -f "edgeone.json" ]; then
    echo "❌ 错误: 找不到 edgeone.json 配置文件"
    exit 1
fi

if [ ! -f "functions/tmdb.js" ]; then
    echo "❌ 错误: 找不到 functions/tmdb.js 文件"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"

# 验证配置文件
echo "🔍 验证配置文件..."
node -e "
try {
    const config = require('./edgeone.json');
    console.log('✅ edgeone.json 配置文件格式正确');
    console.log('📋 配置摘要:');
    console.log('  - 重定向规则:', config.redirects?.length || 0, '条');
    console.log('  - 重写规则:', config.rewrites?.length || 0, '条');
    console.log('  - 头部规则:', config.headers?.length || 0, '条');
} catch (error) {
    console.error('❌ edgeone.json 配置文件格式错误:', error.message);
    process.exit(1);
}
"

if [ $? -ne 0 ]; then
    exit 1
fi

# 检查函数文件语法
echo "🔍 验证函数文件..."
node -c functions/tmdb.js

if [ $? -ne 0 ]; then
    echo "❌ functions/tmdb.js 语法错误"
    exit 1
fi

echo "✅ 函数文件语法正确"

echo "🎉 部署准备完成！"
echo ""
echo "📝 接下来的步骤:"
echo "1. 登录腾讯云控制台: https://console.cloud.tencent.com/edgeone/pages"
echo "2. 点击'创建项目'，选择您的 GitHub 仓库"
echo "3. 在项目配置中填入:"
echo "   - 构建命令: npm install"
echo "   - 输出目录: ."
echo "4. 点击'开始部署'按钮"
echo ""
echo "🔗 更多信息请参考: https://edgeone.cloud.tencent.com/pages/document/"
