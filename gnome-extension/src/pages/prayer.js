// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 zickrian

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import {VERTICAL} from '../compat.js';
import {PRAYER_METHODS, prayerCountdown} from '../prayerRules.js';
import {watchClock} from '../wallClock.js';
import {label} from '../widgets.js';
import {Page} from './page.js';

export const PrayerPage = GObject.registerClass({Signals: {'stop-adhan': {}}},
class PrayerPage extends Page {
    _init(daemon, {height}) {
        super._init(daemon, {style_class: 'thepuchnotch-page thepuchnotch-prayer', layout_manager: new Clutter.BoxLayout({orientation: Clutter.Orientation.VERTICAL}), height});
        this.name = 'prayer';
        this._title = label('Jadwal Shalat', 'thepuchnotch-prayer-title');
        this._next = label('Atur lokasi di Settings → Prayer Times', 'thepuchnotch-prayer-next');
        this._source = label('', 'thepuchnotch-prayer-source');
        this.add_child(this._title);
        this.add_child(this._next);
        this._times = new St.BoxLayout({style_class: 'thepuchnotch-prayer-times', x_expand: true});
        this._cells = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].map(name => {
            const box = new St.BoxLayout({...VERTICAL, style_class: 'thepuchnotch-prayer-cell', x_expand: true});
            box.add_child(label(name, 'thepuchnotch-prayer-name'));
            const time = label('—', 'thepuchnotch-prayer-time');
            box.add_child(time);
            this._times.add_child(box);
            return {name, box, time};
        });
        this.add_child(this._times);
        const footer = new St.BoxLayout({x_expand: true});
        this._source.x_expand = true;
        footer.add_child(this._source);
        const stop = new St.Button({label: 'Stop adzan', style_class: 'thepuchnotch-button', can_focus: true, accessible_name: 'Stop adzan'});
        stop.connect('clicked', () => this.emit('stop-adhan'));
        footer.add_child(stop);
        this.add_child(footer);
        this.watch(['prayer'], () => this._update());
        this.connect('destroy', () => this._unwatch?.());
        this._update();
    }

    onActivate() {
        this._unwatch = watchClock(() => this._update());
        this._update();
    }

    onDeactivate() {
        this._unwatch?.();
        this._unwatch = null;
    }

    _update() {
        const state = this.daemon.state.prayer ?? {};
        // Refuse yesterday's cached display even if the service has not yet published midnight.
        const zone = state.timezone ? GLib.TimeZone.new_identifier(state.timezone) : null;
        const localDate = zone ? GLib.DateTime.new_now(zone).format('%Y-%m-%d') : '';
        const today = state.today?.date === localDate ? state.today : null;
        const next = state.next;
        const countdown = prayerCountdown(next);
        this._title.text = state.city ? `${state.city} · ${today?.date ?? ''}` : 'Jadwal Shalat';
        this._next.text = countdown ? `${next.name} ${next.time} · ${countdown} lagi`
            : state.error || (state.loading ? 'Memuat jadwal…' : 'Atur lokasi di Settings → Prayer Times');
        const method = PRAYER_METHODS.find(([id]) => Number(id) === state.method)?.[1] ?? '';
        this._source.text = state.error && today ? 'Jadwal tersimpan · pembaruan gagal'
            : `AlAdhan · ${method}${state.timezone ? ` · ${state.timezone}` : ''}`;
        for (const cell of this._cells) {
            cell.time.text = today?.prayers?.find(p => p.name === cell.name)?.time ?? '—';
            if (countdown && next.name === cell.name && today?.prayers?.some(p => p.at_ms === next.at_ms))
                cell.box.add_style_class_name('thepuchnotch-prayer-upcoming');
            else
                cell.box.remove_style_class_name('thepuchnotch-prayer-upcoming');
        }
    }
});
