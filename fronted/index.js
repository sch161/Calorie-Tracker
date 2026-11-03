import { supabase } from './main.js';
import { FOOD_API_KEY } from './config.js';

// 초기 변수
let user = null;
let profile = null;
const RING_CIRCUMFERENCE = 2 * Math.PI * 52; // 원 둘레 (반지름 52)

// 식사 종류 → 한글 배지 매핑
const mealLabelMap = {
    breakfast: { text: '아침', className: 'meal-badge--breakfast' },
    lunch: { text: '점심', className: 'meal-badge--lunch' },
    dinner: { text: '저녁', className: 'meal-badge--dinner' },
    snack: { text: '간식', className: 'meal-badge--snack' },
};

async function init() {
    // 로그인 확인
    const { data: { user: loggedInUser } } = await supabase.auth.getUser();
    user = loggedInUser;

    if (!user) {
        window.location.href = './login.html';
        return; // 로그인 안 된 사용자면 로그인 페이지로 넘어가고 함수 종료
    }

    // users 테이블에서 프로필 가져오기
    const { data, error } = await supabase
        .from('users')
        .select('name, goal, target_kcal')
        .eq('user_id', user.id)
        .single();
    profile = data;

    // 에러 처리
    if (error) {
        console.error('프로필 조회 실패:', error.message);
        return;
    }

    // 사용자 이름 불러오기
    document.querySelector('.avatar').textContent = profile.name;

    // 사용자 목표 kcal 표시
    document.querySelector('.sub').textContent = `/ ${profile.target_kcal.toLocaleString()} kcal`;
    document.querySelector('.goal').textContent = `유지 목표 · ${profile.target_kcal.toLocaleString()} kcal`;

    await loadTodayLogs();
}

init();

// 로그아웃 버튼
document.getElementById('btn-logout').addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { alert('로그아웃 실패: ' + error.message); return; }
    window.location.href = './login.html';
});

// kcal 목표 변경 함수
const goalEdit = async () => {
    const newKcal = prompt('새 목표 칼로리를 입력하세요 (kcal)', profile.target_kcal);

    // 값이 없거나, 숫자가 아니면 그냥 종료
    if (!newKcal || isNaN(newKcal)) return;

    // DB에 새로운 값 수정
    const { error: updateError } = await supabase
        .from('users')
        .update({ target_kcal: parseInt(newKcal) })
        .eq('user_id', user.id);

    // if 에러 나면 경고창
    if (updateError) {
        alert('수정 실패: ' + updateError.message);
        return;
    }

    // 새로고침해서 변경된 값 반영
    location.reload();
}

// 목표 수정 버튼 눌렀을 때 goalEdit 함수 실행
document.querySelector('.btn-edit').addEventListener('click', goalEdit);

// 오늘 날짜 반영
const today = new Date();
const day = () => {
    if (today.getDay() === 0) return '일';
    else if (today.getDay() === 1) return '월';
    else if (today.getDay() === 2) return '화';
    else if (today.getDay() === 3) return '수';
    else if (today.getDay() === 4) return '목';
    else if (today.getDay() === 5) return '금';
    else return '토';
}
const todayString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 ${day()}요일`;
document.querySelector('.date').textContent = todayString;

// ---- 메뉴 추가 기능 ----

// 메뉴 추가 모달 열기
function openFoodModal() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center; z-index: 999;
    `;
    overlay.innerHTML = `
        <div style="background:#fff; border-radius:12px; padding:24px; width:360px; max-height:80vh; overflow-y:auto;">
            <h3 style="margin:0 0 12px;">메뉴 추가</h3>
            <input id="foodSearchInput" type="text" placeholder="음식 이름 검색" style="width:100%; box-sizing:border-box; padding:10px; border:1px solid #ddd; border-radius:6px;" />
            <div id="foodSearchResults" style="margin-top:12px;"></div>
            <button id="closeFoodModal" style="margin-top:16px; width:100%; padding:10px; background:#eee; border:none; border-radius:6px; cursor:pointer;">닫기</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // 닫기 버튼
    document.getElementById('closeFoodModal').addEventListener('click', () => overlay.remove());

    // 검색창 입력 감지 (0.4초 debounce)
    const input = document.getElementById('foodSearchInput');
    let debounceTimer;
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => searchFood(input.value.trim(), overlay), 400);
    });
}

// 식약처 API로 음식 검색
async function searchFood(keyword, overlay) {
    const resultsBox = document.getElementById('foodSearchResults');
    if (!keyword) { resultsBox.innerHTML = ''; return; }

    resultsBox.innerHTML = '검색 중...';

    const url = `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03?serviceKey=${FOOD_API_KEY}&type=json&FOOD_NM_KR=${encodeURIComponent(keyword)}&numOfRows=20`;

    try {
        const res = await fetch(url);
        const json = await res.json();
        const items = json.body?.items ?? [];

        // 검색어와 정확히 일치하는 이름을 맨 위로 정렬
        items.sort((a, b) => {
            const aExact = a.FOOD_NM_KR === keyword ? 0 : 1;
            const bExact = b.FOOD_NM_KR === keyword ? 0 : 1;
            if (aExact !== bExact) return aExact - bExact;
            return a.FOOD_NM_KR.length - b.FOOD_NM_KR.length;
        });

        // "직접 입력하기" 버튼: 결과가 있든 없든 항상 맨 위에 고정
        const customBtnHtml = `
            <button id="customFoodBtn" style="width:100%; padding:8px; margin-bottom:10px; border:1px dashed #6b8e5a; color:#6b8e5a; background:#fff; border-radius:6px; cursor:pointer; font-family:inherit;">
                찾는 음식이 없나요? 직접 입력하기
            </button>
        `;

        if (items.length === 0) {
            resultsBox.innerHTML = customBtnHtml + `<p style="color:#999; font-size:13px;">검색 결과가 없어요.</p>`;
        } else {
            resultsBox.innerHTML = customBtnHtml + items.map((item, i) => `
                <div class="food-result" data-index="${i}" style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;">
                    <strong>${item.FOOD_NM_KR}</strong>
                    <span style="color:#999; font-size:12px; float:right;">${item.SERVING_SIZE} · ${item.AMT_NUM1}kcal</span>
                </div>
            `).join('');

            resultsBox.querySelectorAll('.food-result').forEach((el) => {
                el.addEventListener('click', () => {
                    const item = items[el.dataset.index];
                    openGramInput({
                        custom: false,
                        name: item.FOOD_NM_KR,
                        servingSize: parseFloat(item.SERVING_SIZE),
                        kcal: parseFloat(item.AMT_NUM1),
                    }, overlay);
                });
            });
        }

        // 직접 입력 버튼은 결과 유무 상관없이 항상 연결 (if/else 바깥에서 딱 한 번만)
        document.getElementById('customFoodBtn').addEventListener('click', () => openGramInput({ custom: true, name: keyword }, overlay));

    } catch (err) {
        resultsBox.innerHTML = `<p style="color:red; font-size:13px;">검색 실패</p>`;
        console.error(err);
    }
}

// 먹은 양 / 식사 종류 입력 단계
function openGramInput(food, overlay) {
    const resultsBox = document.getElementById('foodSearchResults');
    resultsBox.innerHTML = `
        <p style="font-weight:600;">${food.name}</p>
        ${food.custom ? `
            <label style="font-size:13px;">100g당 칼로리 (kcal)</label>
            <input id="customKcalInput" type="number" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #ddd; border-radius:6px;" />
        ` : ''}
        <label style="font-size:13px;">먹은 양 (g)</label>
        <input id="gramInput" type="number" value="${food.servingSize ?? 100}" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #ddd; border-radius:6px;" />
        <label style="font-size:13px;">식사 종류</label>
        <select id="mealTypeInput" style="width:100%; padding:8px; margin-bottom:12px; border:1px solid #ddd; border-radius:6px;">
            <option value="breakfast">아침</option>
            <option value="lunch">점심</option>
            <option value="dinner">저녁</option>
            <option value="snack">간식</option>
        </select>
        <button id="confirmAddFood" style="width:100%; padding:10px; background:#6b8e5a; color:#fff; border:none; border-radius:6px; cursor:pointer;">추가하기</button>
    `;

    // 추가하기 버튼 눌렀을 때
    document.getElementById('confirmAddFood').addEventListener('click', async () => {
        const grams = parseFloat(document.getElementById('gramInput').value);
        const mealType = document.getElementById('mealTypeInput').value;

        // 100g 기준 칼로리 계산 (직접입력 vs API값)
        let per100g;
        if (food.custom) {
            per100g = parseFloat(document.getElementById('customKcalInput').value);
            if (!per100g) { alert('칼로리를 입력해주세요.'); return; }
        } else {
            per100g = food.kcal * (100 / food.servingSize);
        }

        if (!grams) { alert('먹은 양을 입력해주세요.'); return; }

        await addFoodLog(food.name, per100g, grams, mealType);
        overlay.remove(); // 모달 제거
        await loadTodayLogs(); // 목록/칼로리 갱신
    });
}

// foods, food_logs 테이블에 저장
async function addFoodLog(foodName, per100g, grams, mealType) {
    // foods 테이블에 이미 있는지 확인
    let { data: existing } = await supabase
        .from('foods')
        .select('food_id')
        .eq('food_name', foodName)
        .maybeSingle();

    let foodId;
    if (existing) {
        foodId = existing.food_id;
    } else {
        // 없으면 새로 등록
        const { data: newFood, error } = await supabase
            .from('foods')
            .insert({ food_name: foodName, kcal_per_unit: Math.round(per100g) })
            .select()
            .single();
        if (error) { alert('음식 저장 실패: ' + error.message); return; }
        foodId = newFood.food_id;
    }

    // 실제 섭취 칼로리 계산 후 기록 저장
    const actualKcal = Math.round(per100g * (grams / 100));
    const todayDate = new Date().toISOString().split('T')[0];

    const { error: logError } = await supabase.from('food_logs').insert({
        user_id: user.id,
        food_id: foodId,
        log_date: todayDate,
        meal_type: mealType,
        quantity: grams,
        kcal: actualKcal,
    });

    if (logError) alert('기록 저장 실패: ' + logError.message);
}

// 오늘 먹은 메뉴 불러와서 화면에 그리기
async function loadTodayLogs() {
    const todayDate = new Date().toISOString().split('T')[0];
    const { data: logs, error } = await supabase
        .from('food_logs')
        .select('log_id, kcal, quantity, meal_type, foods(food_name)')
        .eq('user_id', user.id)
        .eq('log_date', todayDate);

    if (error) { console.error(error); return; }

    const menuCard = document.querySelector('.menu-card');
    const totalEaten = logs.reduce((sum, log) => sum + log.kcal, 0);
    const remaining = profile.target_kcal - totalEaten;

    // 칼로리 숫자 갱신
    document.querySelector('.ring-text .num').textContent = totalEaten.toLocaleString();   // 원 안: 먹은 칼로리
    document.querySelector('.big-number .num').textContent = remaining.toLocaleString();   // 큰 숫자: 남은 칼로리

    // 칼로리 바(원) 채우기
    const ratio = profile.target_kcal > 0 ? Math.min(totalEaten / profile.target_kcal, 1) : 0;
    const progressCircle = document.getElementById('progressCircle');
    progressCircle.style.strokeDasharray = RING_CIRCUMFERENCE;
    progressCircle.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - ratio);
    progressCircle.style.stroke = totalEaten > profile.target_kcal ? '#c0392b' : '#6b8e5a'; // 초과하면 빨간색

    if (logs.length === 0) {
        // 빈 상태 표시
        menuCard.querySelector('.menu-empty').style.display = 'flex';
        const list = menuCard.querySelector('.menu-list');
        if (list) list.remove();
    } else {
        // 기록 리스트 표시
        menuCard.querySelector('.menu-empty').style.display = 'none';
        let list = menuCard.querySelector('.menu-list');
        if (!list) {
            list = document.createElement('div');
            list.className = 'menu-list';
            // 목록이 "+ 메뉴 추가" 버튼 위에 오도록 버튼 앞에 삽입
            menuCard.insertBefore(list, menuCard.querySelector('.btn-primary'));
        }

        list.innerHTML = logs.map((log) => {
            const meal = mealLabelMap[log.meal_type] ?? { text: log.meal_type, className: '' };
            return `
                <div class="menu-item">
                    <span class="meal-badge ${meal.className}">${meal.text}</span>
                    <span class="food-name">${log.foods.food_name} ${log.quantity}g</span>
                    <span class="kcal">${log.kcal} kcal</span>
                    <button class="delete-btn" data-log-id="${log.log_id}">×</button>
                </div>
            `;
        }).join('');

        // 삭제 버튼 연결
        list.querySelectorAll('.delete-btn').forEach((btn) => {
            btn.addEventListener('click', async () => {
                await deleteFoodLog(btn.dataset.logId);
            });
        });
    }
}

// 메뉴 삭제
async function deleteFoodLog(logId) {
    const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('log_id', logId);

    if (error) { alert('삭제 실패: ' + error.message); return; }
    await loadTodayLogs();
}

// 메뉴 추가 버튼 연결
document.querySelectorAll('.btn-outline, .menu-card > .btn-primary').forEach((btn) => {
    btn.addEventListener('click', openFoodModal);
});