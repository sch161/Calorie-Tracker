import { supabase } from "./main.js";

// 이미 로그인한 적이 있다면 바로 index.html로 이동
const { data: { session } } = await supabase.auth.getSession();
if (session) {
    location.replace('index.html');
}

// 로그인 버튼 클릭 시 id, pw를 가져옴
document.getElementById('loginbtn').addEventListener('click', async () => {
    const logInId = document.getElementById('login_id').value.trim();
    const login_pw = document.getElementById('login_pw').value;

    // 유효성 체크
    if (!logInId || !login_pw) {
        alert('아이디와 비밀번호 모두 입력해주세요.');
        return;
    }

    // 이메일로 supabase에 저장하기 때문에 id + @caloriapp.com 형식으로 supabase한테 보냄
    const email = `${logInId}@caloriapp.com`;

    // supabase 내장 함수 signInWithPassword로 로그인 요청을 보냄
    const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: login_pw,
    });

    // 로그인 에러가 오면 경고창
    if (error) {
        alert('로그인 실패: 아이디 또는 비밀번호를 확인해주세요.');
        return;
    }

    // 
    window.location.href = './index.html';
});