/* ============================================================
   RapidWMS Pro - Charts Module
   Pure Canvas API charting (no external libraries)
   ============================================================ */

const Charts = (() => {
    const COLORS = {
        blue: '#1a3a8f',
        red: '#e31e24',
        green: '#10b981',
        cyan: '#0ea5e9',
        purple: '#8b5cf6',
        orange: '#f59e0b',
        pink: '#ec4899',
        teal: '#14b8a6',
        gray: '#6b7280',
        lightGray: '#e5e7eb'
    };

    const CATEGORY_COLORS = {
        'Aires Acondicionados': '#1a3a8f',
        'Fumigación': '#10b981',
        'Piscinas': '#0ea5e9'
    };

    function getPixelRatio(ctx) {
        return window.devicePixelRatio || 1;
    }

    function setupCanvas(canvas, width, height) {
        const ratio = getPixelRatio();
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio);
        return ctx;
    }

    // ── Donut / Pie Chart ────────────────────────────────────

    function drawDonut(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const w = options.width || canvas.parentElement.clientWidth || 300;
        const h = options.height || 250;
        const ctx = setupCanvas(canvas, w, h);

        const centerX = w * 0.4;
        const centerY = h / 2;
        const radius = Math.min(centerX, centerY) - 20;
        const innerRadius = radius * 0.55;
        const total = data.reduce((s, d) => s + d.value, 0);

        if (total === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '14px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Sin datos', w / 2, h / 2);
            return;
        }

        let startAngle = -Math.PI / 2;
        const slices = [];

        data.forEach((item, i) => {
            const sliceAngle = (item.value / total) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = item.color || Object.values(COLORS)[i % Object.values(COLORS).length];
            ctx.fill();
            slices.push({ startAngle, endAngle: startAngle + sliceAngle, color: ctx.fillStyle, label: item.label, value: item.value });
            startAngle += sliceAngle;
        });

        // Inner circle for donut
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // Center text
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total.toLocaleString(), centerX, centerY - 8);
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.fillText('Total', centerX, centerY + 12);

        // Legend
        const legendX = w * 0.7;
        let legendY = (h - data.length * 28) / 2 + 10;
        data.forEach((item, i) => {
            ctx.fillStyle = item.color || Object.values(COLORS)[i % Object.values(COLORS).length];
            ctx.fillRect(legendX, legendY, 12, 12);
            ctx.fillStyle = '#374151';
            ctx.font = '12px system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(item.label, legendX + 18, legendY);
            const pct = ((item.value / total) * 100).toFixed(1) + '%';
            ctx.fillStyle = '#6b7280';
            ctx.font = '11px system-ui, sans-serif';
            ctx.fillText(pct + ' (' + item.value + ')', legendX + 18, legendY + 14);
            legendY += 30;
        });
    }

    // ── Bar Chart ────────────────────────────────────────────

    function drawBar(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const w = options.width || canvas.parentElement.clientWidth || 400;
        const h = options.height || 250;
        const ctx = setupCanvas(canvas, w, h);

        const padding = { top: 30, right: 20, bottom: 50, left: 60 };
        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;

        const maxVal = Math.max(...data.map(d => d.value), 1);
        const niceMax = Math.ceil(maxVal / 5) * 5;
        const barWidth = Math.min((chartW / data.length) * 0.6, 50);
        const gap = (chartW - barWidth * data.length) / (data.length + 1);

        // Grid lines
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#6b7280';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + chartH - (chartH * i / 5);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();
            const label = Math.round(niceMax * i / 5);
            ctx.fillText(options.formatValue ? options.formatValue(label) : label.toLocaleString(), padding.left - 8, y);
        }

        // Bars
        data.forEach((item, i) => {
            const x = padding.left + gap + i * (barWidth + gap);
            const barH = (item.value / niceMax) * chartH;
            const y = padding.top + chartH - barH;

            // Bar gradient
            const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH);
            const col = item.color || COLORS.blue;
            grad.addColorStop(0, col);
            grad.addColorStop(1, col + '99');
            ctx.fillStyle = grad;

            // Rounded top corners
            const r = 4;
            ctx.beginPath();
            ctx.moveTo(x, padding.top + chartH);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.lineTo(x + barWidth - r, y);
            ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
            ctx.lineTo(x + barWidth, padding.top + chartH);
            ctx.closePath();
            ctx.fill();

            // Value on top
            ctx.fillStyle = '#374151';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(options.formatValue ? options.formatValue(item.value) : item.value.toLocaleString(), x + barWidth / 2, y - 4);

            // Label
            ctx.fillStyle = '#6b7280';
            ctx.font = '11px system-ui, sans-serif';
            ctx.textBaseline = 'top';
            ctx.save();
            ctx.translate(x + barWidth / 2, padding.top + chartH + 8);
            if (data.length > 6) ctx.rotate(-0.4);
            ctx.fillText(item.label, 0, 0);
            ctx.restore();
        });

        // Title
        if (options.title) {
            ctx.fillStyle = '#1f2937';
            ctx.font = 'bold 13px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(options.title, w / 2, 5);
        }
    }

    // ── Line Chart ───────────────────────────────────────────

    function drawLine(canvasId, datasets, labels, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const w = options.width || canvas.parentElement.clientWidth || 400;
        const h = options.height || 220;
        const ctx = setupCanvas(canvas, w, h);

        const padding = { top: 30, right: 20, bottom: 45, left: 55 };
        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;

        let allValues = [];
        datasets.forEach(ds => allValues = allValues.concat(ds.data));
        const maxVal = Math.max(...allValues, 1);
        const niceMax = Math.ceil(maxVal / 5) * 5;

        // Grid
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#6b7280';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + chartH - (chartH * i / 5);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();
            ctx.fillText(Math.round(niceMax * i / 5).toLocaleString(), padding.left - 8, y);
        }

        // X labels
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        labels.forEach((label, i) => {
            const x = padding.left + (chartW / (labels.length - 1 || 1)) * i;
            ctx.fillStyle = '#6b7280';
            ctx.fillText(label, x, padding.top + chartH + 8);
        });

        // Lines
        datasets.forEach(ds => {
            ctx.strokeStyle = ds.color || COLORS.blue;
            ctx.lineWidth = 2.5;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ds.data.forEach((val, i) => {
                const x = padding.left + (chartW / (labels.length - 1 || 1)) * i;
                const y = padding.top + chartH - (val / niceMax) * chartH;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Area fill
            if (ds.fill !== false) {
                ctx.globalAlpha = 0.08;
                ctx.lineTo(padding.left + chartW, padding.top + chartH);
                ctx.lineTo(padding.left, padding.top + chartH);
                ctx.closePath();
                ctx.fillStyle = ds.color || COLORS.blue;
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // Dots
            ds.data.forEach((val, i) => {
                const x = padding.left + (chartW / (labels.length - 1 || 1)) * i;
                const y = padding.top + chartH - (val / niceMax) * chartH;
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.strokeStyle = ds.color || COLORS.blue;
                ctx.lineWidth = 2.5;
                ctx.stroke();
            });
        });

        // Legend if multiple datasets
        if (datasets.length > 1) {
            let lx = padding.left;
            datasets.forEach(ds => {
                ctx.fillStyle = ds.color || COLORS.blue;
                ctx.fillRect(lx, h - 12, 12, 4);
                ctx.fillStyle = '#374151';
                ctx.font = '11px system-ui, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.fillText(ds.label, lx + 16, h - 4);
                lx += ctx.measureText(ds.label).width + 36;
            });
        }

        // Title
        if (options.title) {
            ctx.fillStyle = '#1f2937';
            ctx.font = 'bold 13px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(options.title, w / 2, 5);
        }
    }

    // ── Horizontal Bar Chart ─────────────────────────────────

    function drawHorizontalBar(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const w = options.width || canvas.parentElement.clientWidth || 400;
        const h = options.height || Math.max(200, data.length * 38 + 40);
        const ctx = setupCanvas(canvas, w, h);

        const padding = { top: 25, right: 60, bottom: 10, left: 140 };
        const chartW = w - padding.left - padding.right;
        const barHeight = Math.min(24, (h - padding.top - padding.bottom) / data.length - 8);
        const maxVal = Math.max(...data.map(d => d.value), 1);

        data.forEach((item, i) => {
            const y = padding.top + i * (barHeight + 10);
            const barW = (item.value / maxVal) * chartW;

            // Label
            ctx.fillStyle = '#374151';
            ctx.font = '12px system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            const label = item.label.length > 20 ? item.label.substring(0, 18) + '...' : item.label;
            ctx.fillText(label, padding.left - 10, y + barHeight / 2);

            // Bar bg
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(padding.left, y, chartW, barHeight);

            // Bar
            const col = item.color || COLORS.blue;
            const grad = ctx.createLinearGradient(padding.left, y, padding.left + barW, y);
            grad.addColorStop(0, col);
            grad.addColorStop(1, col + 'cc');
            ctx.fillStyle = grad;
            ctx.beginPath();
            const r = 3;
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + barW - r, y);
            ctx.quadraticCurveTo(padding.left + barW, y, padding.left + barW, y + r);
            ctx.lineTo(padding.left + barW, y + barHeight - r);
            ctx.quadraticCurveTo(padding.left + barW, y + barHeight, padding.left + barW - r, y + barHeight);
            ctx.lineTo(padding.left, y + barHeight);
            ctx.closePath();
            ctx.fill();

            // Value
            ctx.fillStyle = '#374151';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(options.formatValue ? options.formatValue(item.value) : item.value.toLocaleString(), padding.left + barW + 6, y + barHeight / 2);
        });

        if (options.title) {
            ctx.fillStyle = '#1f2937';
            ctx.font = 'bold 13px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(options.title, w / 2, 3);
        }
    }

    // ── Gauge Chart ──────────────────────────────────────────

    function drawGauge(canvasId, value, max, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const size = options.size || 120;
        const ctx = setupCanvas(canvas, size, size * 0.7);

        const centerX = size / 2;
        const centerY = size * 0.6;
        const radius = size * 0.38;
        const pct = Math.min(value / max, 1);

        // Background arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, 0);
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Value arc
        const color = pct < 0.5 ? COLORS.green : pct < 0.8 ? COLORS.orange : COLORS.red;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, Math.PI + Math.PI * pct);
        ctx.strokeStyle = color;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Text
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(pct * 100) + '%', centerX, centerY - 5);

        if (options.label) {
            ctx.fillStyle = '#6b7280';
            ctx.font = '10px system-ui, sans-serif';
            ctx.fillText(options.label, centerX, centerY + 12);
        }
    }

    // ── Mini Sparkline ───────────────────────────────────────

    function drawSparkline(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const w = options.width || 150;
        const h = options.height || 40;
        const ctx = setupCanvas(canvas, w, h);

        const max = Math.max(...data, 1);
        const min = Math.min(...data, 0);
        const range = max - min || 1;
        const step = w / (data.length - 1 || 1);
        const color = options.color || COLORS.blue;

        ctx.beginPath();
        data.forEach((val, i) => {
            const x = i * step;
            const y = h - ((val - min) / range) * (h - 8) - 4;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Area
        ctx.lineTo((data.length - 1) * step, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = color + '15';
        ctx.fill();
    }

    return { drawDonut, drawBar, drawLine, drawHorizontalBar, drawGauge, drawSparkline, COLORS, CATEGORY_COLORS };
})();
