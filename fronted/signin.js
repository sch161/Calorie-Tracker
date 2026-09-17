import { supabase } from './main.js';

const customCalorieBox = document.querySelector('.custom-calorie'); // 목표 - 직접설정

// 목표 라디오 바뀔 때 마다 직접설정 박스 보이기/숨기기
document.querySelectorAll('input[name="goal"]').forEach((radio) => {
    radio.addEventListener('change', () => {
        customCalorieBox.style.display = radio.value === 'self' ? 'block' : 'none';
    });
});

// 라디오 value(diet / keep / bulkUp / self) => DB 숫자 코드 변환
const goalMap = {
    diet: 1,
    keep: 2,
    bulkUp: 3,
    self: 0
};

// 가입하기 버튼 눌렀을 때
document.getElementById('signupbtn').addEventListener('click', async () => {
    // 버튼 눌렀을 때 체크된 값 가져옴
    const genderInput = document.querySelector('input[name="gender"]:checked');
    const goalInput = document.querySelector('input[name="goal"]:checked');

    // DB에 저장할 값들
    const name = document.getElementById('name').value.trim();
    const signupId = document.getElementById('signup_id').value.trim();
    const password = document.getElementById('signup_pw').value;
    const age = parseInt(document.getElementById('age').value);
    const goalKcalRaw = document.getElementById('goal_kcal').value;
    const targetKcal = parseInt(goalKcalRaw.replace(/,/g, '')); // "1,800" → 1800

    const gender = parseInt(genderInput.value); // "1"/"2" → 1/2
    const goal = goalMap[goalInput.value]; // "diet" → 1 등

    if (!name || !signupId || !password || !age) {
        alert('내용을 모두 입력해주세요.');
        return;
    }

    // "직접설정" 아닌데 목표칼로리가 비어있는 건 정상 상황이라 별도로 체크
    if (goal === 0 && !targetKcal) {
        alert('목표 칼로리를 입력해주세요.');
        return;
    }

    // supabase에서 아이디만 등록이 불가능해서 가짜 이메일로 변환 후 저장
    const fakeEmail = `${signupId}@caloriapp.com`;

    // Supabase Auth 계정 생성
    const { data, error } = await supabase.auth.signUp({
        email: fakeEmail,
        password: password,
    });

    // 회원가입 실패 시
    if (error) {
        alert('회원가입 실패: ' + error.message);
        return;
    }

    // users 테이블에 프로필 정보 저장
    const { error: profileError } = await supabase.from('users').insert({
        user_id: data.user.id,
        name: name,
        age: age,
        gender: gender,
        goal: goal,
        target_kcal: goal === 0 ? targetKcal : null, // 직접설정일 때만 저장 (아니면 null)
    });

    // 저장 실패 시
    if (profileError) {
        alert('프로필 저장 실패: ' + profileError.message);
        return;
    }

    // 회원가입 성공 후 login 페이지로 연결
    alert('회원가입 완료!');
    window.location.href = './login.html';
});