import { supabase } from "./main.js";

document.getElementById('loginbtn').addEventListener('click', async () => {
    const logInId = document.getElementById('login_id').value.trim();
    const login_pw = document.getElementById('login_pw').value;

    if (!logInId || !login_pw) {
        alert('아이디와 비밀번호 모두 입력해주세요.');
        return;
    }

    const email = `${logInId}@caloriapp.com`;

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: login_pw,
    });

    if (error) {
        alert('로그인 실패: 아이디 또는 비밀번호를 확인해주세요.');
        return;
    }

    window.location.href = './main.html';
});