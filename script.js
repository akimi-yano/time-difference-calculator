document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const timezoneSelect = document.getElementById('timezone-select');
    const addButton = document.getElementById('add-button');
    const resetButton = document.getElementById('reset-time-button');
    const datePicker = document.getElementById('date-picker');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const clocksContainer = document.getElementById('clocks-container');
    const timeIndicatorFrame = document.getElementById('time-indicator-frame');
    const scrollLeftBtn = document.getElementById('scroll-left-btn');
    const scrollRightBtn = document.getElementById('scroll-right-btn');
    const currentHomeTimeDisplay = document.getElementById('current-home-time-display');

    // 状態管理
    let selectionStart = new Date();
    selectionStart.setMinutes(0, 0, 0);
    let selectionEnd = new Date(selectionStart.getTime() + 3600 * 1000 - 1);
    let isSelecting = false;
    let selectionAnchor = null;
    let selectedTimezones = [
        { tz: 'Asia/Tokyo', isHome: true },
        { tz: 'America/Los_Angeles', isHome: false }
    ];

    // メイン描画関数
    function renderAll() {
        clocksContainer.querySelectorAll('.clock-row').forEach(row => row.remove());
        selectedTimezones.forEach((zoneInfo, index) => {
            clocksContainer.insertBefore(createClockRow(zoneInfo, index), timeIndicatorFrame);
        });
        updateDatePicker();
        updateIndicatorFrame();
    }

    // ヘルパー関数
    function createClockRow(zoneInfo, index) {
        const { tz, isHome } = zoneInfo;
        const timeFormatter = new Intl.DateTimeFormat('ja-JP', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
        const dateFormatter = new Intl.DateTimeFormat('ja-JP', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' });
        
        const startTimeString = timeFormatter.format(selectionStart);
        const endTimeString = timeFormatter.format(new Date(selectionEnd.getTime() + 1));
        const dateString = dateFormatter.format(selectionStart);
        const cityName = tz.split('/').pop().replace(/_/g, ' ');

        const clockRow = document.createElement('div');
        clockRow.className = `clock-row ${isHome ? 'is-home' : ''}`;
        clockRow.dataset.index = index;
        
        // 左パネル：都市の名前や時間など
        clockRow.innerHTML = `
            <div class="left-panel">
                <div class="left-panel-top">
                    <span class="city-name">${cityName}</span>
                    <div class="clock-actions">
                        <button class="home-button ${isHome ? 'is-home' : ''}" title="ホームに設定">★</button>
                        <button class="delete-button" title="都市を削除">✖</button>
                    </div>
                </div>
                <div class="time-range-display">
                    <div class="time-group">
                        <span class="display-time">${startTimeString}</span>
                        <span class="time-separator">→</span>
                        <span class="display-time">${endTimeString}</span>
                    </div>
                    <span class="date-label">${dateString}</span>
                </div>
            </div>
        `;
        
        // 右パネル：タイムライン
        const timelineWrapper = document.createElement('div');
        timelineWrapper.className = 'timeline-scroll-wrapper';

        const timeline = document.createElement('div');
        timeline.className = 'timeline';
        
        const homeTimezone = selectedTimezones.find(z => z.isHome)?.tz || tz;
        const homeDayStart = getStartOfDayInTimezone(selectionStart, homeTimezone);
        
        for (let i = 0; i < 24; i++) {
            // ホームカントリーの時間に基づいてブロックを作成
            const homeBlockDate = new Date(homeDayStart.getTime() + i * 3600 * 1000);
            const homeBlockTimestamp = homeBlockDate.getTime();
            
            // 現在のタイムゾーンでの対応する時間を計算
            const currentTzDate = new Date(homeBlockDate.toLocaleString('en-US', {timeZone: tz}));
            const localHour = currentTzDate.getHours();
            const dayNightClass = (localHour >= 6 && localHour < 19) ? 'is-day' : 'is-night';
            
            // 選択範囲の判定（ホームカントリーの時間に基づいて）
            const isSelected = (homeBlockTimestamp >= selectionStart.getTime() && homeBlockTimestamp <= selectionEnd.getTime());
            
            const hourBlock = document.createElement('div');
            hourBlock.className = `hour-block ${isSelected ? 'is-selected-range' : ''} ${dayNightClass}`;
            hourBlock.dataset.timestamp = homeBlockTimestamp;
            hourBlock.style.width = `calc(100% / 24)`;
            hourBlock.textContent = localHour;
            timeline.appendChild(hourBlock);
        }
        
        timelineWrapper.appendChild(timeline);
        
        clockRow.appendChild(timelineWrapper);
        return clockRow;
    }

    function updateIndicatorFrame() {
        const homeRow = clocksContainer.querySelector('.clock-row.is-home');
        if (!homeRow) { timeIndicatorFrame.style.display = 'none'; return; }
        const selectedBlocks = homeRow.querySelectorAll('.is-selected-range');
        if (selectedBlocks.length > 0) {
            const leftPanel = homeRow.querySelector('.left-panel');
            const firstRect = selectedBlocks[0].getBoundingClientRect();
            const lastRect = selectedBlocks[selectedBlocks.length - 1].getBoundingClientRect();
            const leftPosition = leftPanel.offsetWidth + (firstRect.left - leftPanel.getBoundingClientRect().right);
            const width = lastRect.right - firstRect.left;
            timeIndicatorFrame.style.left = `${leftPosition}px`;
            timeIndicatorFrame.style.width = `${width}px`;
            timeIndicatorFrame.style.height = `${clocksContainer.offsetHeight}px`;
            timeIndicatorFrame.style.display = 'block';
        } else {
            timeIndicatorFrame.style.display = 'none';
        }
    }
    
    function getStartOfDayInTimezone(date, tz) {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(date).reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
        const hour = parts.hour === '24' ? 0 : parseInt(parts.hour, 10);
        const msSinceMidnight = (hour * 3600 + parseInt(parts.minute, 10) * 60 + parseInt(parts.second, 10)) * 1000 + date.getMilliseconds();
        return new Date(date.getTime() - msSinceMidnight);
    }

    function updateDatePicker() { if (selectedTimezones.length > 0) datePicker.value = selectionStart.toLocaleDateString('en-CA'); }
    function populateTimezoneSelect() { Intl.supportedValuesOf('timeZone').forEach(tz => timezoneSelect.add(new Option(tz.replace(/\//g, ' / ').replace(/_/g, ' '), tz))); timezoneSelect.value = 'Europe/Paris'; }

    // イベントリスナー
    function initEventListeners() {
        addButton.addEventListener('click', () => { const tz = timezoneSelect.value; if (tz && !selectedTimezones.some(z => z.tz === tz)) { selectedTimezones.push({ tz, isHome: false }); renderAll(); } });
        resetButton.addEventListener('click', () => { selectionStart = new Date(); selectionStart.setMinutes(0, 0, 0); selectionEnd = new Date(selectionStart.getTime() + 3600 * 1000 - 1); renderAll(); });
        scrollLeftBtn.addEventListener('click', () => { selectionStart.setDate(selectionStart.getDate() - 1); selectionEnd.setDate(selectionEnd.getDate() - 1); renderAll(); });
        scrollRightBtn.addEventListener('click', () => { selectionStart.setDate(selectionStart.getDate() + 1); selectionEnd.setDate(selectionEnd.getDate() + 1); renderAll(); });
        datePicker.addEventListener('change', () => { const [year, month, day] = datePicker.value.split('-').map(Number); selectionStart.setFullYear(year, month - 1, day); selectionEnd.setFullYear(year, month - 1, day); renderAll(); });
        darkModeToggle.addEventListener('click', () => { 
            document.body.classList.toggle('dark-mode'); 
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            darkModeToggle.textContent = isDark ? '☀️' : '🌙';
        });
        
        clocksContainer.addEventListener('click', (e) => {
            const row = e.target.closest('.clock-row');
            if (!row || e.target.closest('.timeline-scroll-wrapper')) return;
            const index = parseInt(row.dataset.index);
            if (isNaN(index)) return;
            if (e.target.matches('.delete-button')) {
                selectedTimezones.splice(index, 1);
                if (selectedTimezones.length > 0 && !selectedTimezones.some(z => z.isHome)) { selectedTimezones[0].isHome = true; }
            } else if (e.target.matches('.home-button')) {
                selectedTimezones.forEach(z => z.isHome = false);
                if (selectedTimezones[index]) selectedTimezones[index].isHome = true;
            }
            renderAll();
        });
        
        const handleTimeSelection = (e) => { const target = e.target.closest('.hour-block'); if (!target) return; const time = parseInt(target.dataset.timestamp); if (isSelecting) { const start = Math.min(selectionAnchor, time); const end = Math.max(selectionAnchor, time); selectionStart = new Date(start); selectionEnd = new Date(end + 3600 * 1000 - 1); } else { selectionStart = new Date(time); selectionEnd = new Date(time + 3600 * 1000 - 1); } renderAll(); };
        clocksContainer.addEventListener('mousedown', (e) => { const target = e.target.closest('.hour-block'); if (target) { isSelecting = true; selectionAnchor = parseInt(target.dataset.timestamp); handleTimeSelection(e); } });
        document.addEventListener('mousemove', (e) => { if (isSelecting) { e.preventDefault(); handleTimeSelection(e); } });
        document.addEventListener('mouseup', () => { isSelecting = false; selectionAnchor = null; });
        
        window.addEventListener('resize', renderAll);
    }

    // 初期化
    function init() {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            darkModeToggle.textContent = '☀️';
        } else {
            darkModeToggle.textContent = '🌙';
        }
        
        setInterval(() => {
            const homeTzData = selectedTimezones.find(z => z.isHome);
            if (homeTzData) {
                const now = new Date();
                const formatter = new Intl.DateTimeFormat('ja-JP', { timeZone: homeTzData.tz, hour: '2-digit', minute: '2-digit', second:'2-digit' });
                currentHomeTimeDisplay.textContent = `ホームの現在時刻 (${homeTzData.tz.split('/').pop()}): ${formatter.format(now)}`;
            } else if (selectedTimezones.length > 0) {
                 currentHomeTimeDisplay.textContent = '（ホームが設定されていません）';
            } else {
                currentHomeTimeDisplay.textContent = '（都市を追加してください）';
            }
        }, 1000);
        
        populateTimezoneSelect();
        initEventListeners();
        renderAll();
    }

    init();
});