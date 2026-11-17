// Renders the same screen for every style; each HTML file only swaps the stylesheet.
const D = window.MOCK
const rp = (n) => 'Rp' + n.toLocaleString('id-ID')
const durasi = (m) => `${Math.floor(m / 60)} j ${String(m % 60).padStart(2, '0')} m`
const jamKe = (t) => { const [h, m] = t.split(':').map(Number); return h + m / 60 }
const statusKelas = { 'Confirmed': 'pill-positive', 'Booked': 'pill-accent', 'Waiting for the payment': 'pill-warning', 'Cancelled': 'pill-neutral' }
const state = { jam: 'semua', urut: 'jam' }

const tersedia = D.penerbangan.filter((p) => p.sisa > 0)
const termurah = tersedia.reduce((a, b) => (b.harga < a.harga ? b : a))

function ico(name) {
  const p = {
    search: '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/>',
    route: '<circle cx="3.5" cy="12.5" r="1.5"/><circle cx="12.5" cy="3.5" r="1.5"/><path d="M5 12.5h4.5a2.5 2.5 0 0 0 0-5h-3a2.5 2.5 0 0 1 0-5H11"/>',
    ticket: '<path d="M2 5V3.5h12V5a1.5 1.5 0 0 0 0 3 1.5 1.5 0 0 0 0 3v1.5H2V11a1.5 1.5 0 0 0 0-3 1.5 1.5 0 0 0 0-3Z"/>',
    check: '<path d="m3 8.5 3 3 7-7"/>',
    user: '<circle cx="8" cy="5.5" r="2.75"/><path d="M2.5 14c.6-2.7 2.8-4.2 5.5-4.2s4.9 1.5 5.5 4.2"/>',
    menu: '<path d="M2 4h12M2 8h12M2 12h12"/>',
    moon: '<path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z"/>',
    swap: '<path d="M3 5.5h10l-2.5-2.5M13 10.5H3l2.5 2.5"/>',
  }[name]
  return `<svg class="ico" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`
}

document.querySelector('#app').innerHTML = `
<aside class="sidebar" id="sidebar">
  <div class="brand"><span class="mark" aria-hidden="true"></span>CutiTerbang</div>
  <nav aria-label="Menu utama">
    <p class="nav-group">Penerbangan</p>
    <a class="nav-item active" href="#" aria-current="page">${ico('search')}Cari Penerbangan</a>
    <a class="nav-item" href="#">${ico('route')}Multi-destinasi</a>
    <p class="nav-group">Perjalanan saya</p>
    <a class="nav-item" href="#">${ico('ticket')}Tiket Saya</a>
    <a class="nav-item" href="#">${ico('check')}Validasi Tiket</a>
    <p class="nav-group">Akun</p>
    <a class="nav-item" href="#">${ico('user')}Profil</a>
  </nav>
  <div class="user-row">
    <span class="avatar" aria-hidden="true">${D.user.inisial}</span>
    <span class="user-text"><strong>${D.user.nama}</strong><small>${D.user.peran}</small></span>
  </div>
</aside>
<header class="topbar">
  <button class="menu-btn" type="button" aria-label="Buka menu" aria-controls="sidebar" aria-expanded="false">${ico('menu')}</button>
  <span class="topbar-title">Cari Penerbangan</span>
  <label class="topbar-search">${ico('search')}<input aria-label="Cek kode booking" placeholder="Cek kode booking" /></label>
  <button class="theme-btn" type="button">${ico('moon')}<span>Mode gelap</span></button>
</header>
<main class="sheet">
  <div class="title-row">
    <h1>Jakarta (CGK) → Denpasar (DPS)</h1>
    <p class="finding">${D.pencarian.tanggal} · ${D.pencarian.penumpang} penumpang · ${tersedia.length} dari ${D.penerbangan.length} penerbangan tersedia, termurah <strong class="num">${rp(termurah.harga)}</strong> pukul ${termurah.berangkat}</p>
  </div>

  <form class="search-form" onsubmit="return false">
    <label class="f-city"><span>Dari</span><input value="Jakarta (CGK)" /></label>
    <button class="swap" type="button" aria-label="Tukar asal dan tujuan">${ico('swap')}</button>
    <label class="f-city"><span>Ke</span><input value="Denpasar (DPS)" /></label>
    <label class="f-date"><span>Tanggal</span><input type="date" value="${D.pencarian.tanggalInput}" /></label>
    <label class="f-pax"><span>Penumpang</span><input type="number" min="1" value="1" /></label>
    <button class="btn-primary" type="submit">Cari</button>
  </form>

  <div class="layout">
    <section class="results" aria-labelledby="h-hasil">
      <div class="results-head">
        <h2 id="h-hasil">Penerbangan</h2>
        <div class="chips" role="group" aria-label="Jam keberangkatan">
          ${D.jam.map((j) => `<button type="button" class="chip" data-jam="${j.id}" aria-pressed="${j.id === 'semua'}">${j.label}</button>`).join('')}
        </div>
      </div>
      <div class="strip" aria-hidden="true">
        <div class="strip-track">
          <div class="strip-range" hidden></div>
          ${D.penerbangan.map((p) => `<span class="strip-mark${p.sisa ? '' : ' habis'}" data-nomor="${p.nomor}" style="left:${(jamKe(p.berangkat) / 24) * 100}%"></span>`).join('')}
        </div>
        <div class="strip-ticks">${[0, 6, 12, 18, 24].map((h) => `<span style="left:${(h / 24) * 100}%">${String(h).padStart(2, '0')}:00</span>`).join('')}</div>
      </div>
      <div class="toolbar">
        <span class="count num" id="count"></span>
        <label class="sort"><span>Urutkan</span>
          <select id="urut"><option value="jam">Jam berangkat</option><option value="harga">Harga terendah</option></select>
        </label>
      </div>
      <table class="flights">
        <thead><tr>
          <th scope="col">Penerbangan</th><th scope="col" class="num">Berangkat</th><th scope="col" class="num">Tiba</th>
          <th scope="col" class="num">Durasi</th><th scope="col" class="num">Sisa kursi</th><th scope="col" class="num">Harga / orang</th><th scope="col" class="act"><span class="sr">Aksi</span></th>
        </tr></thead>
        <tbody id="rows"></tbody>
      </table>
    </section>

    <aside class="rail" aria-labelledby="h-pesan">
      <div class="rail-head"><h2 id="h-pesan">Pemesanan saya</h2><a href="#">Lihat semua</a></div>
      <ul class="bookings">
        ${D.pemesanan.map((b) => `<li>
          <span class="b-main"><code>${b.kode}</code><small>${b.rute} · ${b.tanggal}</small></span>
          <span class="pill ${statusKelas[b.status]}">${b.status}</span>
        </li>`).join('')}
      </ul>
    </aside>
  </div>
</main>`

function renderRows() {
  const j = D.jam.find((x) => x.id === state.jam)
  const inRange = (p) => { const h = jamKe(p.berangkat); return h >= j.dari && h < j.sampai }
  const list = D.penerbangan.filter(inRange)
    .sort((a, b) => (state.urut === 'harga' ? a.harga - b.harga : jamKe(a.berangkat) - jamKe(b.berangkat)))
  const ok = list.filter((p) => p.sisa > 0).length
  document.querySelector('#count').textContent = list.length ? `${list.length} penerbangan · ${ok} tersedia` : 'Tidak ada penerbangan'
  document.querySelector('#rows').innerHTML = list.length ? list.map((p) => `
    <tr class="${p.sisa ? '' : 'habis'}${p === termurah ? ' termurah' : ''}">
      <td class="ident"><span class="logo" data-kode="${p.kode}" aria-hidden="true">${p.kode}</span><span class="id-text"><strong>${p.maskapai}</strong><small>${p.nomor}</small></span></td>
      <td class="num t"><span class="lbl">Berangkat </span>${p.berangkat} <small>WIB</small></td>
      <td class="num t"><span class="lbl">Tiba </span>${p.tiba} <small>WITA</small></td>
      <td class="num dur">${durasi(p.menit)}</td>
      <td class="num seats${p.sisa > 0 && p.sisa <= 4 ? ' low' : ''}">${p.sisa > 0 ? `<span class="lbl">Sisa </span>${p.sisa}<span class="lbl"> kursi</span>` : '<span class="lbl">Sisa kursi </span>0'}</td>
      <td class="num price">${rp(p.harga)}</td>
      <td class="act">${p.sisa ? `<button type="button" class="btn-ghost">Pesan</button>` : `<span class="soldout">Kursi sudah habis</span>`}</td>
    </tr>`).join('') : `<tr class="empty"><td colspan="7">Tidak ada penerbangan pada jam ini. Pilih jam lain.</td></tr>`
  const range = document.querySelector('.strip-range')
  range.style.left = (j.dari / 24) * 100 + '%'
  range.style.width = ((j.sampai - j.dari) / 24) * 100 + '%'
  range.hidden = j.id === 'semua'
  document.querySelectorAll('.strip-mark').forEach((el) => {
    el.classList.toggle('dim', !inRange(D.penerbangan.find((x) => x.nomor === el.dataset.nomor)))
  })
}
renderRows()

document.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
  state.jam = b.dataset.jam
  document.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
  renderRows()
}))
document.querySelector('#urut').addEventListener('change', (e) => { state.urut = e.target.value; renderRows() })

// Theme: follows the device until the viewer picks one.
const root = document.documentElement
const themeBtn = document.querySelector('.theme-btn')
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches)
const syncTheme = () => { themeBtn.querySelector('span').textContent = isDark() ? 'Mode terang' : 'Mode gelap' }
themeBtn.addEventListener('click', () => { root.dataset.theme = isDark() ? 'light' : 'dark'; syncTheme() })
syncTheme()

const menuBtn = document.querySelector('.menu-btn')
menuBtn.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open')
  menuBtn.setAttribute('aria-expanded', String(open))
})
