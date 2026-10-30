import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// 캐시(R2/KV)는 아직 쓰지 않는다. 분석 화면은 요청마다 서버에서 계산하는 동적 페이지다
export default defineCloudflareConfig();
