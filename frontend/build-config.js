// Vercel 배포할 때 환경변수로 js/config.js 를 만든다 (키가 GitHub에 안 올라가게 하려는 용도)
const fs = require('fs');
const path = require('path');

const keys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'FOOD_API_KEY'];

// 환경변수가 빠져 있으면 배포를 멈추고 어떤 게 없는지 알려줌
for (const key of keys) {
    if (!process.env[key]) {
        console.error(`환경변수 ${key} 가 없습니다. Vercel > Settings > Environment Variables 를 확인하세요.`);
        process.exit(1);
    }
}

const content = keys
    .map((key) => `export const ${key} = ${JSON.stringify(process.env[key])};`)
    .join('\n') + '\n';

fs.writeFileSync(path.join(__dirname, 'js', 'config.js'), content);
console.log('js/config.js 생성 완료');