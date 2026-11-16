import { supabase } from './main.js';

// ---- 설정값 ----

// 입력 허용 범위 (이 범위를 벗어나면 잘못 입력한 것으로 봄)
const HEIGHT_RANGE = { min: 50, max: 250 }; // cm
const WEIGHT_RANGE = { min: 10, max: 300 }; // kg

// BMI 단계 (대한비만학회 기준) — 막대의 5칸과 순서가 같음
const BMI_STAGES = [
    { from: 15, to: 18.5, label: '저체중', className: 'level-1' },
    { from: 18.5, to: 23, label: '정상 범위', className: 'level-2' },
    { from: 23, to: 25, label: '과체중', className: 'level-3' },
    { from: 25, to: 30, label: '1단계 비만', className: 'level-4' },
    { from: 30, to: 35, label: '2단계 비만', className: 'level-5' },
];
const LEVEL_CLASSES = BMI_STAGES.map((stage) => stage.className);

// ---- 화면 요소 ----
const form = document.getElementById('bmiForm');
const heightInput = document.getElementById('heightInput');
const weightInput = document.getElementById('weightInput');
const resultCard = document.getElementById('resultCard');
const bmiValue = document.getElementById('bmiValue');
const bmiStatus = document.getElementById('bmiStatus');
const bmiMarker = document.getElementById('bmiMarker');

// ---- 로그인 확인 + 이름 표시 (main1.js와 같은 방식) ----
async function init() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = './login.html';
        return;
    }

    const { data: profile, error } = await supabase
        .from('users')
        .select('name')
        .eq('user_id', user.id)
        .single();

    if (error) {
        console.error('프로필 조회 실패:', error.message);
        return;
    }

    document.querySelector('.avatar').textContent = profile.name;
}

init();

// 로그아웃 버튼
document.getElementById('btn-logout').addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { alert('로그아웃 실패: ' + error.message); return; }
    window.location.href = './login.html';
});

// ---- 잘못 입력한 것 걸러내기 ----

// 문제가 있으면 알림 + 빨간 테두리 + 그 칸으로 커서 이동, null 반환
function fail(input, message) {
    alert(message);
    input.classList.add('is-error');
    input.focus();
    return null;
}

// 입력값을 숫자로 바꾸고 검사. 통과하면 숫자, 아니면 null
function readNumber(input, name, unit, range) {
    const raw = input.value.trim();

    // 1) 빈칸 (숫자가 아닌 글자를 넣어도 number 입력칸은 빈 값이 됨)
    if (raw === '') return fail(input, `${name}를 입력해주세요.`);

    const value = Number(raw);

    // 2) 0 이하, 숫자가 아닌 값
    if (!Number.isFinite(value) || value <= 0) {
        return fail(input, `${name}는 0보다 큰 숫자로 입력해주세요.`);
    }

    // 3) 사람 키/몸무게로 말이 안 되는 값
    if (value < range.min || value > range.max) {
        return fail(input, `${name}는 ${range.min}~${range.max}${unit} 사이로 입력해주세요.`);
    }

    return value;
}

// 다시 입력하기 시작하면 빨간 테두리 제거
[heightInput, weightInput].forEach((input) => {
    input.addEventListener('input', () => input.classList.remove('is-error'));
});

// ---- BMI 계산 ----

// BMI = 몸무게(kg) ÷ 키(m)², 소수 첫째 자리까지
function calculateBmi(heightCm, weightKg) {
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    return Math.round(bmi * 10) / 10;
}

// BMI가 몇 번째 칸(단계)인지 찾기
function getStage(bmi) {
    if (bmi >= 35) return { index: 4, label: '3단계 비만', className: 'level-5' };
    const index = BMI_STAGES.findIndex((stage) => bmi < stage.to);
    return { index, ...BMI_STAGES[index] };
}

// 마커 위치(%) 계산: 칸 하나 = 20%, 칸 안에서는 비율만큼 이동
function getMarkerPercent(bmi, stage) {
    if (bmi >= 35) return 100;
    const { from, to } = BMI_STAGES[stage.index];
    const ratio = Math.min(Math.max((bmi - from) / (to - from), 0), 1); // 0~1로 고정
    return (stage.index + ratio) * 20;
}

// 결과 카드에 그리기
function renderResult(bmi) {
    const stage = getStage(bmi);

    bmiValue.textContent = bmi.toFixed(1);
    bmiStatus.textContent = stage.label;

    // 단계별 색: 이전 단계 클래스 지우고 새 클래스 추가
    resultCard.classList.remove(...LEVEL_CLASSES);
    resultCard.classList.add(stage.className);

    // 막대 위 마커 이동
    bmiMarker.style.left = `${getMarkerPercent(bmi, stage)}%`;
    bmiMarker.classList.add('is-visible');
}

// 계산하기 버튼 (또는 Enter)
form.addEventListener('submit', (e) => {
    e.preventDefault(); // form 기본 동작(새로고침) 막기

    const height = readNumber(heightInput, '키', 'cm', HEIGHT_RANGE);
    if (height === null) return;

    const weight = readNumber(weightInput, '몸무게', 'kg', WEIGHT_RANGE);
    if (weight === null) return;

    renderResult(calculateBmi(height, weight));
});
