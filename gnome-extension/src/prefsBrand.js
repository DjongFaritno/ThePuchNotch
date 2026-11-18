// SPDX-License-Identifier: GPL-3.0-or-later
// ThePuchNotch preferences identity. Native GTK widgets remain keyboard accessible.
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

export const PROJECT = 'https://github.com/DjongFaritno/ThePuchNotch';

export function stylePreferences(window) {
    window.add_css_class('puch-preferences');
    const css = new Gtk.CssProvider();
    css.load_from_string(`
        .puch-preferences .suggested-action { background-color: #26765f; color: white; }
        .puch-preferences preferencesgroup { margin-bottom: 12px; }
        .puch-preferences row { padding-top: 6px; padding-bottom: 6px; }
        .puch-hero { padding: 28px 18px; border-radius: 24px; background: rgba(38, 118, 95, 0.08); }
        .puch-title { font-size: 28px; font-weight: 800; letter-spacing: -1px; }
        .puch-tagline { font-size: 14px; }
        .puch-overline { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #26765f; }
        .puch-nav { padding: 18px; border-radius: 16px; }
        .puch-about { padding: 28px 22px; }
        .puch-about button { border-radius: 10px; padding: 10px 16px; }
    `);
    Gtk.StyleContext.add_provider_for_display(window.get_display(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
    window.connect('close-request', () => {
        Gtk.StyleContext.remove_provider_for_display(window.get_display(), css);
        return false;
    });
}

export function brandHero(path, version, about = false) {
    const box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 12,
        css_classes: [about ? 'puch-about' : 'puch-hero'], halign: Gtk.Align.FILL});
    box.append(new Gtk.Image({file: `${path}/icons/thepuchnotch-brand.svg`, pixel_size: 72, halign: Gtk.Align.CENTER}));
    box.append(new Gtk.Label({label: 'thepuchnotch', css_classes: ['puch-title'], halign: Gtk.Align.CENTER}));
    box.append(new Gtk.Label({label: `Version ${version}`, css_classes: ['dim-label'], halign: Gtk.Align.CENTER}));
    box.append(new Gtk.Label({label: 'A little space for everything happening now.\nMusic, focus, prayer times, and your everyday desktop.',
        wrap: true, justify: Gtk.Justification.CENTER, max_width_chars: 52,
        css_classes: ['puch-tagline'], margin_top: 10, margin_bottom: 10}));
    return box;
}

export function homePage(path, version, window) {
    const page = new Adw.PreferencesPage({title: 'Home', name: 'home', icon_name: 'go-home-symbolic'});
    const intro = new Adw.PreferencesGroup();
    intro.add(brandHero(path, version));
    page.add(intro);
    const group = new Adw.PreferencesGroup({title: 'Make it yours', description: 'One workspace. Your rhythm.'});
    const grid = new Gtk.Grid({column_spacing: 12, row_spacing: 12, column_homogeneous: true});
    const items = [
        ['Workspace', 'Shape, glass & placement', 'island'],
        ['Modules', 'Pages, order & shortcuts', 'modules'],
        ['Sounds & alerts', 'Notifications & lyrics', 'alerts'],
        ['Puch assistant', 'Character, voice & models', 'assistant'],
        ['Prayer times', 'Location & adzan', 'prayer'],
        ['Focus', 'Sessions & breaks', 'timer'],
    ];
    items.forEach(([title, subtitle, name], index) => {
        const card = new Gtk.Button({css_classes: ['puch-nav'], hexpand: true});
        const content = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: 5});
        content.append(new Gtk.Label({label: title, xalign: 0, css_classes: ['heading']}));
        content.append(new Gtk.Label({label: subtitle, xalign: 0, wrap: true, css_classes: ['dim-label']}));
        card.child = content;
        card.connect('clicked', () => (window.visible_page_name = name));
        grid.attach(card, index % 2, Math.floor(index / 2), 1, 1);
    });
    group.add(grid);
    page.add(group);
    return page;
}
