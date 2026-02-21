import db from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboard();

    document.getElementById('refresh-btn').addEventListener('click', async () => {
        document.getElementById('table-container').classList.add('loading');
        await loadDashboard();
        document.getElementById('table-container').classList.remove('loading');
    });
});

async function loadDashboard() {
    try {
        // 1. Load Stats
        const stats = await db.getStats();
        // Animate numbers for wow effect
        animateValue('stat-pages', 0, stats.pagesToday, 1000);
        animateValue('stat-words', 0, stats.wordsToday, 1000);

        // Load recent visits
        const limit = 50; // Get more for the dashboard
        const visits = await db.getRecentVisits(limit);

        document.getElementById('stat-total-visits').textContent = visits.length >= limit ? `${limit}+` : visits.length;

        // 2. Render History Table
        renderTable(visits);

        // 3. Render Chart
        renderChart(visits);

    } catch (error) {
        console.error("Failed to load dashboard data:", error);
    }
}

function renderTable(visits) {
    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = '';

    if (visits.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No reading history logged yet. Browse some articles!</td></tr>`;
        return;
    }

    visits.forEach(visit => {
        const tr = document.createElement('tr');

        // Format time
        const date = new Date(visit.timestamp);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString();
        const displayTime = date.toDateString() === new Date().toDateString() ? `Today, ${timeStr}` : `${dateStr} ${timeStr}`;

        // Truncate title
        let title = visit.title || 'Unknown Title';

        tr.innerHTML = `
            <td style="color: var(--text-muted); font-size: 0.875rem;">${displayTime}</td>
            <td class="td-title" title="${title}">${title}</td>
            <td class="td-url"><a href="${visit.url}" target="_blank">${new URL(visit.url).hostname}</a></td>
            <td><span class="badge">${visit.wordCount || 0}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// A simple SVG bar chart to keep it dependency-free
function renderChart(visits) {
    const chartContainer = document.getElementById('chart-container');
    chartContainer.innerHTML = ''; // Clear

    // Group visits by day for the last 7 days
    const days = 7;
    const dataByDay = {};

    // Initialize last 7 days with 0
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toLocaleDateString();
        dataByDay[dateKey] = { dateStr: dateKey, shortDate: d.toLocaleDateString([], { month: 'short', day: 'numeric' }), words: 0 };
    }

    // Aggregate data
    visits.forEach(visit => {
        const d = new Date(visit.timestamp);
        const dateKey = d.toLocaleDateString();
        if (dataByDay[dateKey]) {
            dataByDay[dateKey].words += (parseInt(visit.wordCount) || 0);
        }
    });

    const chartData = Object.values(dataByDay);
    const maxWords = Math.max(...chartData.map(d => d.words), 100); // at least 100 to avoid /0

    // Build a flexbox-based bar chart
    const chartWrapper = document.createElement('div');
    chartWrapper.style.display = 'flex';
    chartWrapper.style.height = '100%';
    chartWrapper.style.alignItems = 'flex-end';
    chartWrapper.style.justifyContent = 'space-around';
    chartWrapper.style.paddingTop = '20px'; // Space for tooltips/labels

    chartData.forEach(dayInfo => {
        const heightPercent = (dayInfo.words / maxWords) * 100;

        const barContainer = document.createElement('div');
        barContainer.style.display = 'flex';
        barContainer.style.flexDirection = 'column';
        barContainer.style.alignItems = 'center';
        barContainer.style.height = '100%';
        barContainer.style.justifyContent = 'flex-end';
        barContainer.style.flex = '1';
        barContainer.style.position = 'relative';

        const bar = document.createElement('div');
        bar.style.width = '60%';
        bar.style.maxWidth = '40px';
        bar.style.backgroundColor = 'var(--primary)';
        bar.style.height = '0%'; // Start at 0 for animation
        bar.style.borderRadius = '4px 4px 0 0';
        bar.style.transition = 'height 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        bar.style.position = 'relative';

        // Tooltip
        bar.title = `${dayInfo.words.toLocaleString()} words`;

        // Hover effect
        bar.addEventListener('mouseenter', () => bar.style.backgroundColor = 'var(--primary-hover)');
        bar.addEventListener('mouseleave', () => bar.style.backgroundColor = 'var(--primary)');

        const label = document.createElement('div');
        label.textContent = dayInfo.shortDate;
        label.style.fontSize = '0.75rem';
        label.style.color = 'var(--text-muted)';
        label.style.marginTop = '0.5rem';

        barContainer.appendChild(bar);
        barContainer.appendChild(label);
        chartWrapper.appendChild(barContainer);

        // Trigger animation
        setTimeout(() => {
            bar.style.height = `calc(${heightPercent}% - 30px)`; // Account for label height
        }, 100);
    });

    chartContainer.appendChild(chartWrapper);
}

// Utility for animating numbers
function animateValue(id, start, end, duration) {
    if (start === end) {
        document.getElementById(id).innerHTML = end.toLocaleString();
        return;
    }
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        obj.innerHTML = current.toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end.toLocaleString();
        }
    };
    window.requestAnimationFrame(step);
}
