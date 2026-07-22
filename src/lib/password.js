
// ===================== PASSWORD =====================
async function openPasswordPanel(me) {
    const { body, close } = fullOverlay('Keamanan Akun', 'Ganti atau atur ulang password');
    body.innerHTML = `
        <div class="flex items-center border-b border-gray-200 mb-4">
            <button id="tabChange" class="flex-1 py-3 text-center text-sm font-bold border-b-2 border-indigo-500 text-indigo-500">Ganti Password</button>
            <button id="tabForgot" class="flex-1 py-3 text-center text-sm font-bold border-b-2 border-transparent text-gray-400">Lupa Password</button>
        </div>
        <div id="contentChange">
            <form id="formChangePw" class="space-y-3">
                <input type="password" id="oldPw" placeholder="Password saat ini" class="field" required>
                <input type="password" id="newPw" placeholder="Password baru" class="field" required>
                <input type="password" id="confirmPw" placeholder="Ketik ulang password baru" class="field" required>
                <button type="submit" class="btn btn-primary w-full !mt-4">Simpan Password Baru</button>
            </form>
        </div>
        <div id="contentForgot" class="hidden text-center">
            <div class="p-4 rounded-lg bg-yellow-50 text-yellow-700 text-xs font-semibold border border-yellow-200 mb-4">
                Fitur ini akan mengirim pesan ke Kak Aziz untuk meminta reset password ke pengaturan awal.
            </div>
            <button id="btnForgot" class="btn btn-warning w-full"><i class="fa-brands fa-whatsapp"></i> Minta Reset via WhatsApp</button>
        </div>
    `;

    const tabChange = body.querySelector('#tabChange');
    const tabForgot = body.querySelector('#tabForgot');
    const contentChange = body.querySelector('#contentChange');
    const contentForgot = body.querySelector('#contentForgot');

    const switchTab = (active) => {
        if (active === 'change') {
            tabChange.classList.add('border-indigo-500', 'text-indigo-500');
            tabChange.classList.remove('border-transparent', 'text-gray-400');
            tabForgot.classList.add('border-transparent', 'text-gray-400');
            tabForgot.classList.remove('border-indigo-500', 'text-indigo-500');
            contentChange.classList.remove('hidden');
            contentForgot.classList.add('hidden');
        } else {
            tabForgot.classList.add('border-indigo-500', 'text-indigo-500');
            tabForgot.classList.remove('border-transparent', 'text-gray-400');
            tabChange.classList.add('border-transparent', 'text-gray-400');
            tabChange.classList.remove('border-indigo-500', 'text-indigo-500');
            contentForgot.classList.remove('hidden');
            contentChange.classList.add('hidden');
        }
    };

    tabChange.addEventListener('click', () => switchTab('change'));
    tabForgot.addEventListener('click', () => switchTab('forgot'));

    // Logic Ganti Password
    body.querySelector('#formChangePw').addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldPw = body.querySelector('#oldPw').value;
        const newPw = body.querySelector('#newPw').value;
        const confirmPw = body.querySelector('#confirmPw').value;

        if (newPw !== confirmPw) {
            return toast('Password baru tidak cocok.', 'warning');
        }
        if (newPw.length < 6) {
            return toast('Password baru minimal 6 karakter.', 'warning');
        }

        const btn = e.submitter;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

        try {
            await api('/api/student/change-password', {
                method: 'POST',
                body: { oldPassword: oldPw, newPassword: newPw }
            });
            await modal({ type: 'success', title: 'Berhasil!', message: 'Password berhasil diganti. Silakan login ulang.', confirmText: 'OK' });
            close();
        } catch (ex) {
            logError('Gagal ganti password', ex.message);
            toast(ex.message || 'Gagal mengganti password.', 'danger');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Simpan Password Baru';
        }
    });

    // Logic Lupa Password
    body.querySelector('#btnForgot').addEventListener('click', async () => {
        const pesan = `Assalamualaikum kak aziz, saya ${me.name}, lupa password saya nih, maklum saya emang pikun 😊. Tolong reset password saya ya kak, makasih.`;
        try {
            await navigator.clipboard.writeText(pesan);
            toast('Pesan disalin!', 'success');

            // Panggil API untuk menandai butuh reset
            api('/api/student/forgot-password-request', { method: 'POST' }).catch(err => logWarn('Gagal menandai butuh reset', err.message));

            const waUrl = `https://wa.me/6281336889643?text=${encodeURIComponent(pesan)}`;
            window.open(waUrl, '_blank');
        } catch (err) {
            logError('Gagal menyalin atau membuka WA', err.message);
            toast('Gagal menyalin pesan.', 'danger');
        }
    });
}
