// Simple, dependency-free analytics view for U1 devices
// Renders small battery bar and motion timeline into a container element

export function renderU1Analytics(container, u1) {
    if (!container) return;
    container.innerHTML = '';

    if (!u1 || ((!u1.battery || u1.battery.length === 0) && (!u1.motion || u1.motion.length === 0))) {
        container.textContent = 'None';
        return;
    }

    // Battery section
    const batterySection = document.createElement('div');
    batterySection.style.marginBottom = '8px';
    batterySection.innerHTML = '<div style="font-weight:600; margin-bottom:6px;">Battery</div>';

    const latestBattery = (u1.battery && u1.battery.length > 0) ? u1.battery[u1.battery.length -1] : null;
    if (latestBattery) {
        const pct = Math.round(latestBattery.percent);
        const barWrap = document.createElement('div');
        barWrap.style.display = 'flex';
        barWrap.style.alignItems = 'center';
        barWrap.style.gap = '8px';

        const barOuter = document.createElement('div');
        barOuter.style.flex = '1';
        barOuter.style.background = 'var(--card-bg)';
        barOuter.style.height = '12px';
        barOuter.style.borderRadius = '6px';
        barOuter.style.overflow = 'hidden';
        barOuter.style.border = '1px solid rgba(255,255,255,0.04)';

        const barInner = document.createElement('div');
        barInner.style.width = Math.max(2, Math.min(100, pct)) + '%';
        barInner.style.height = '100%';
        barInner.style.background = 'linear-gradient(90deg, var(--accent), rgba(0,0,0,0.15))';

        barOuter.appendChild(barInner);

        const label = document.createElement('div');
        label.style.minWidth = '80px';
        label.style.textAlign = 'right';
        label.style.fontVariantNumeric = 'tabular-nums';
        label.textContent = `${pct}% (${latestBattery.mv} mV)`;

        barWrap.appendChild(barOuter);
        barWrap.appendChild(label);
        batterySection.appendChild(barWrap);

        // Small sparkline made of tiny vertical bars for recent battery % samples
        if (u1.battery.length > 1) {
            const spark = document.createElement('div');
            spark.style.display = 'flex';
            spark.style.gap = '2px';
            spark.style.marginTop = '8px';
            const samples = u1.battery.slice(-20);
            const max = 100;
            for (const s of samples) {
                const bar = document.createElement('div');
                const h = Math.max(2, Math.round((s.percent / max) * 36));
                bar.style.width = '4px';
                bar.style.height = h + 'px';
                bar.style.background = 'var(--accent)';
                bar.style.alignSelf = 'end';
                bar.style.opacity = '0.9';
                spark.appendChild(bar);
            }
            batterySection.appendChild(spark);
        }
    } else {
        batterySection.innerHTML += '<div>No battery readings yet</div>';
    }

    container.appendChild(batterySection);

    // Motion section
    const motionSection = document.createElement('div');
    motionSection.innerHTML = '<div style="font-weight:600; margin-bottom:6px;">Motion</div>';
    if (u1.motion && u1.motion.length > 0) {
        const samples = u1.motion.slice(-10).reverse();
        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '6px';
        for (const s of samples) {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.fontSize = '0.85rem';
            const when = new Date(s.t);
            row.innerHTML = `<span style="color:var(--text-dim);">${when.toLocaleTimeString()}</span><span style="font-weight:600">${s.active ? 'Triggered' : 'Idle'}${s.active ? ' (' + s.countdown + 's)' : ''}</span>`;
            list.appendChild(row);
        }
        motionSection.appendChild(list);
    } else {
        motionSection.innerHTML += '<div>No motion events yet</div>';
    }

    container.appendChild(motionSection);
}
