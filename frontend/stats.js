import { supabase } from './main.js';

// 초기 변수

// init에서 값 채움
let user = null;
let profile = null;

// 주간 / 월간 버튼을 누르면 값이 바뀜
let mode = 'weekly'; // 'weekly' | 'monthly'

const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

// Date → 'YYYY-MM-DD' - DB의 log_date가 이 모양이라서, 같은 모양으로 맞춰야 비교할 수 있기 때문
function toDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// 'YYYY-MM-DD' → Date (new Date('2026-11-02')는 UTC 시차 때문에 하루가 밀릴 수 있어서 쓰지 않음)
function parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// date 기준 n일 뒤 (음수면 n일 전) 날짜를 구함
function addDays(date, n) {
    const result = new Date(date); // 원본 date 가 바뀌면 안 되기 때문에 다른 변수에 복사본을 만듦
    result.setDate(result.getDate() + n);
    return result;
}

// 목표 달성 성공 여부
// 목표 달성 기준: 기록이 있는 날 중 목표 칼로리 이하로 먹은 날
const isAchieved = (total) => total <= profile.target_kcal;

async function init() {
    // 로그인 확인
    // supabase 내장 함수 getUser
    const { data: { user: loggedInUser } } = await supabase.auth.getUser();
    user = loggedInUser;

    if (!user) {
        window.location.href = './login.html';
        return;
    }

    // 프로필 가져오기
    const { data, error } = await supabase
        .from('users')
        .select('name, target_kcal')
        .eq('user_id', user.id)
        .single();

    // 프로필 조회 실패 시
    if (error) {
        console.error('프로필 조회 실패:', error.message);
        return;
    }

    // profile에 user 데이터 담기
    profile = data;

    // index.html 화면 오른쪽 위에 사용자 이름을 넣음
    document.querySelector('.avatar').textContent = profile.name;

    await loadStats();
}

init();

// 로그아웃 버튼 클릭 시
// supabase 내장 함수 signOut 를 사용해 로그아웃 -> login.html로 이동
document.getElementById('btn-logout').addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { alert('로그아웃 실패: ' + error.message); return; }
    window.location.href = './login.html';
});

// 이번 기간 / 지난 기간의 시작일·종료일 구하기
function getPeriods() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 시간 제거 (일수 계산이 어긋나지 않게)

    if (mode === 'weekly') {
        // 오늘 포함 최근 7일 vs 그 직전 7일
        return {
            cur: { start: addDays(today, -6), end: today },
            prev: { start: addDays(today, -13), end: addDays(today, -7) },
        };
    }

    // 이번 달 1일~오늘 vs 지난달 전체
    const y = today.getFullYear();
    const m = today.getMonth();
    return {
        cur: { start: new Date(y, m, 1), end: today },
        prev: { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) }, // 이번 달 0일 = 지난달 마지막 날
    };
}

// 기간 안의 기록을 요약
function summarize(logs, start, end) {
    const startStr = toDateString(start);
    const endStr = toDateString(end);
    const inRange = logs.filter((log) => log.log_date >= startStr && log.log_date <= endStr);

    // 날짜별 합계 → [['2026-11-02', 1850], ...]
    const totals = {};
    inRange.forEach((log) => {
        totals[log.log_date] = (totals[log.log_date] ?? 0) + log.kcal;
    });
    const entries = Object.entries(totals);

    const recorded = entries.length;
    const sum = entries.reduce((s, [, total]) => s + total, 0);

    return {
        avg: recorded > 0 ? Math.round(sum / recorded) : 0,
        achieved: entries.filter(([, total]) => isAchieved(total)).length,
        days: Math.round((end - start) / 86400000) + 1, // 기간 일수
        max: recorded > 0 ? entries.reduce((a, b) => (b[1] > a[1] ? b : a)) : null,
        min: recorded > 0 ? entries.reduce((a, b) => (b[1] < a[1] ? b : a)) : null,
        menuCount: inRange.length, // 기록한 메뉴 개수 (food_logs 행 수)
    };
}

// 최고/최저 섭취일 표시 문자열 (주간: "토 · 2,340", 월간: "12일 · 2,340")
function peakText(entry) {
    if (!entry) return '-';
    const date = parseDate(entry[0]);
    const label = mode === 'weekly' ? dayNames[date.getDay()] : `${date.getDate()}일`;
    return `${label} · ${entry[1].toLocaleString()}`;
}

async function loadStats() {
    const { cur, prev } = getPeriods();

    // 지난 기간 시작일 ~ 이번 기간 종료일까지 한 번에 조회
    const { data: logs, error } = await supabase
        .from('food_logs')
        .select('log_date, kcal')
        .eq('user_id', user.id)
        .gte('log_date', toDateString(prev.start))
        .lte('log_date', toDateString(cur.end));

    if (error) { console.error(error); return; }

    render(summarize(logs, cur.start, cur.end), summarize(logs, prev.start, prev.end), cur);
}

function render(cur, prev, curPeriod) {
    const isWeekly = mode === 'weekly';
    const { start, end } = curPeriod;

    // 기간 라벨
    if (isWeekly) {
        const sameMonth = start.getMonth() === end.getMonth();
        document.getElementById('rangeLabel').textContent = sameMonth
            ? `이번 주 · ${start.getMonth() + 1}월 ${start.getDate()} – ${end.getDate()}일`
            : `이번 주 · ${start.getMonth() + 1}월 ${start.getDate()}일 – ${end.getMonth() + 1}월 ${end.getDate()}일`;
    } else {
        document.getElementById('rangeLabel').textContent = `이번 달 · ${end.getMonth() + 1}월`;
    }

    // 위쪽 카드 2개
    document.getElementById('avgNum').textContent = cur.avg.toLocaleString();
    document.getElementById('rateNum').textContent = Math.round((cur.achieved / cur.days) * 100);
    document.getElementById('rateDesc').textContent = `목표 달성률 (${cur.achieved}/${cur.days}일)`;

    // 비교 표 제목/헤더
    document.getElementById('compareTitle').textContent = isWeekly ? '이번 주 vs 지난 주' : '이번 달 vs 지난 달';
    document.getElementById('thPrev').textContent = isWeekly ? '지난주' : '지난달';
    document.getElementById('thCur').textContent = isWeekly ? '이번주' : '이번달';

    // 비교 표 내용
    const rows = [
        ['평균 섭취', `${prev.avg.toLocaleString()} kcal`, `${cur.avg.toLocaleString()} kcal`],
        ['목표 달성일', `${prev.achieved}일`, `${cur.achieved}일`],
        ['최고 섭취일', peakText(prev.max), peakText(cur.max)],
        ['최저 섭취일', peakText(prev.min), peakText(cur.min)],
        ['기록한 메뉴', `${prev.menuCount}개`, `${cur.menuCount}개`],
    ];

    document.getElementById('compareBody').innerHTML = rows.map(([label, prevVal, curVal]) => `
        <tr>
            <td>${label}</td>
            <td>${prevVal}</td>
            <td class="cur">${curVal}</td>
        </tr>
    `).join('');
}

// 주간/월간 토글
document.querySelectorAll('.period-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        mode = btn.dataset.mode;
        document.querySelectorAll('.period-btn').forEach((b) => {
            b.classList.toggle('active', b === btn);
        });
        loadStats();
    });
});