#!/usr/bin/env python3
import math
from time import monotonic
from datetime import datetime

import gi

gi.require_version("Gdk", "3.0")
gi.require_version("Gtk", "3.0")
from gi.repository import Gdk, GLib, Gtk


class FamilyDisplayDemo(Gtk.Window):
    def __init__(self):
        super().__init__(title="Family Display GTK Demo")
        self.set_decorated(False)
        self.fullscreen()
        self.connect("destroy", Gtk.main_quit)
        self.connect("key-press-event", self.on_key_press)

        self.area = Gtk.DrawingArea()
        self.area.connect("draw", self.draw)
        self.add(self.area)

        self.screens = ["Weather", "Clocks", "Settings"]
        self.screen_index = 0
        self.previous_screen_index = 0
        self.last_switch_at = monotonic()
        self.transition_started_at = None
        self.switch_interval = 3.0
        self.transition_duration = 0.55

        GLib.timeout_add(16, self.tick)

    def tick(self):
        now = monotonic()
        if self.transition_started_at is None and now - self.last_switch_at >= self.switch_interval:
            self.previous_screen_index = self.screen_index
            self.screen_index = (self.screen_index + 1) % len(self.screens)
            self.transition_started_at = now

        if self.transition_started_at is not None and now - self.transition_started_at >= self.transition_duration:
            self.previous_screen_index = self.screen_index
            self.transition_started_at = None
            self.last_switch_at = now

        self.area.queue_draw()
        return True

    def on_key_press(self, _widget, event):
        if Gdk.keyval_name(event.keyval) in {"Escape", "q", "Q"}:
            Gtk.main_quit()
        return False

    def draw(self, _area, cr):
        width = self.get_allocated_width()
        height = self.get_allocated_height()
        now = datetime.now()

        self.background(cr, width, height)

        pad = max(28, width * 0.04)
        top = max(34, height * 0.03)
        status_width = width * 0.22
        active_title = self.screens[self.screen_index]

        self.text(cr, now.strftime("%A, %B %-d"), pad, top, 18, (0.74, 0.78, 0.68), weight="bold")
        self.text(cr, active_title, pad, top + 68, 54, (0.97, 0.94, 0.86), weight="bold")

        self.round_rect(cr, width - pad - status_width, top - 10, status_width, 110, 8)
        cr.set_source_rgba(0.9, 0.93, 0.86, 0.08)
        cr.fill_preserve()
        cr.set_source_rgba(0.9, 0.93, 0.86, 0.16)
        cr.stroke()
        self.text(cr, "Native GTK", width - pad - status_width + 26, top + 22, 16, (0.74, 0.78, 0.68), weight="bold")
        self.text(cr, now.strftime("%-I:%M:%S %p"), width - pad - status_width + 26, top + 72, 34, (0.97, 0.94, 0.86), weight="bold")

        card_gap = 22
        nav_height = 64
        card_top = top + 145
        nav_y = height - pad - nav_height

        def draw_screen(index):
            if index == 0:
                self.weather_screen(cr, pad, card_top, width - pad * 2, nav_y - card_top, card_gap)
            elif index == 1:
                self.clocks_screen(cr, pad, card_top, width - pad * 2, nav_y - card_top, now, card_gap)
            else:
                self.settings_screen(cr, pad, card_top, width - pad * 2, nav_y - card_top)

        progress = self.transition_progress()
        if progress < 1:
            eased = self.ease(progress)
            self.draw_screen_layer(cr, width, card_top, nav_y, -eased * width, 1 - eased, lambda: draw_screen(self.previous_screen_index))
            self.draw_screen_layer(cr, width, card_top, nav_y, (1 - eased) * width, eased, lambda: draw_screen(self.screen_index))
        else:
            draw_screen(self.screen_index)

        self.nav(cr, pad, nav_y, width - pad * 2, nav_height, self.screen_index)
        self.text(cr, "IP raspberrypi.local", pad, height - 12, 13, (0.55, 0.60, 0.55), weight="bold")

    def transition_progress(self):
        if self.transition_started_at is None:
            return 1
        elapsed = monotonic() - self.transition_started_at
        return max(0, min(1, elapsed / self.transition_duration))

    def ease(self, value):
        return 1 - pow(1 - value, 3)

    def draw_screen_layer(self, cr, width, top, bottom, dx, alpha, draw_func):
        cr.save()
        cr.rectangle(0, top - 10, width, bottom - top + 20)
        cr.clip()
        cr.translate(dx, 0)
        cr.push_group()
        draw_func()
        cr.pop_group_to_source()
        cr.paint_with_alpha(alpha)
        cr.restore()

    def weather_screen(self, cr, x, y, w, h, gap):
        card_height = (h - gap * 2 - 20) / 3
        locations = [
            ("Home", "Clear", "12°C", "19° / 11°", "11°C", "79%", "6 km/h", (0.56, 0.84, 0.69)),
            ("San Francisco", "Clear", "12°C", "18° / 12°", "10°C", "87%", "14 km/h", (0.56, 0.74, 0.90)),
            ("New York", "Clear", "9°C", "23° / 7°", "5°C", "57%", "13 km/h", (0.95, 0.76, 0.43)),
        ]

        for index, item in enumerate(locations):
            card_y = y + index * (card_height + gap)
            self.card(cr, x, card_y, w, card_height, item)

    def clocks_screen(self, cr, x, y, w, h, now, gap):
        card_height = (h - gap * 2 - 20) / 3
        clocks = [
            ("Home", now.strftime("%-I:%M %p"), now.strftime("%A, %B %-d"), (0.56, 0.84, 0.69)),
            ("San Francisco", now.strftime("%-I:%M %p"), now.strftime("%A, %B %-d"), (0.56, 0.74, 0.90)),
            ("New York", "11:28 AM", "Monday, May 4", (0.95, 0.76, 0.43)),
        ]

        for index, (name, time_text, date_text, accent) in enumerate(clocks):
            card_y = y + index * (card_height + gap)
            self.clock_card(cr, x, card_y, w, card_height, name, time_text, date_text, accent)

    def settings_screen(self, cr, x, y, w, h):
        self.round_rect(cr, x, y, w, h - 20, 8)
        cr.set_source_rgba(0.82, 0.90, 0.82, 0.12)
        cr.fill_preserve()
        cr.set_source_rgba(0.88, 0.92, 0.84, 0.18)
        cr.stroke()

        self.text(cr, "Animation stress test", x + 40, y + 86, 46, (0.97, 0.94, 0.86), weight="bold")
        self.text(cr, "3 second auto-rotate", x + 40, y + 140, 24, (0.74, 0.78, 0.68), weight="bold")
        self.text(cr, "Single native GTK window", x + 40, y + 208, 30, (0.97, 0.94, 0.86), weight="bold")
        self.text(cr, "Cairo redraw at ~60 FPS during transitions", x + 40, y + 260, 24, (0.74, 0.78, 0.68), weight="bold")
        self.text(cr, "Press q or Esc to quit", x + 40, y + h - 90, 22, (0.74, 0.78, 0.68), weight="bold")

    def background(self, cr, width, height):
        gradient = cairo_linear(0, 0, width, height)
        gradient.add_color_stop_rgb(0, 0.03, 0.09, 0.08)
        gradient.add_color_stop_rgb(0.6, 0.08, 0.16, 0.13)
        gradient.add_color_stop_rgb(1, 0.03, 0.07, 0.06)
        cr.set_source(gradient)
        cr.rectangle(0, 0, width, height)
        cr.fill()

    def card(self, cr, x, y, w, h, item):
        name, condition, temp, high_low, feels, humidity, wind, accent = item
        self.round_rect(cr, x, y, w, h, 8)
        cr.set_source_rgba(0.82, 0.90, 0.82, 0.12)
        cr.fill_preserve()
        cr.set_source_rgba(0.88, 0.92, 0.84, 0.18)
        cr.stroke()

        cr.rectangle(x, y, 5, h)
        cr.set_source_rgb(*accent)
        cr.fill()

        self.text(cr, name, x + 34, y + 72, 48, (0.97, 0.94, 0.86), weight="bold")
        self.text(cr, condition, x + 34, y + 112, 20, (0.74, 0.78, 0.68), weight="bold")

        icon_x = x + w - 98
        icon_y = y + h * 0.33
        self.sun(cr, icon_x, icon_y, 28, accent)
        self.text(cr, temp, x + w - 248, y + h * 0.58, 82, (0.97, 0.94, 0.86), weight="bold")

        line_y = y + h - 86
        cr.set_source_rgba(0.88, 0.92, 0.84, 0.16)
        cr.set_line_width(1)
        cr.move_to(x + 34, line_y)
        cr.line_to(x + w - 34, line_y)
        cr.stroke()

        labels = [("HIGH / LOW", high_low), ("FEELS", feels), ("HUMIDITY", humidity), ("WIND", wind)]
        for idx, (label, value) in enumerate(labels):
            col_x = x + 34 + idx * ((w - 68) / 4)
            self.text(cr, label, col_x, y + h - 54, 12, (0.74, 0.78, 0.68), weight="bold")
            self.text(cr, value, col_x, y + h - 25, 23, (0.97, 0.94, 0.86), weight="bold")

    def clock_card(self, cr, x, y, w, h, name, time_text, date_text, accent):
        self.round_rect(cr, x, y, w, h, 8)
        cr.set_source_rgba(0.82, 0.90, 0.82, 0.12)
        cr.fill_preserve()
        cr.set_source_rgba(0.88, 0.92, 0.84, 0.18)
        cr.stroke()

        cr.rectangle(x, y, 5, h)
        cr.set_source_rgb(*accent)
        cr.fill()

        self.text(cr, name, x + 34, y + h * 0.46, 48, (0.97, 0.94, 0.86), weight="bold")
        self.text(cr, date_text, x + 34, y + h * 0.58, 22, (0.74, 0.78, 0.68), weight="bold")
        self.text(cr, time_text, x + w - 360, y + h * 0.53, 76, (0.97, 0.94, 0.86), weight="bold")

    def nav(self, cr, x, y, w, h, active_index):
        self.round_rect(cr, x, y, w, h, 8)
        cr.set_source_rgba(0.9, 0.93, 0.86, 0.08)
        cr.fill_preserve()
        cr.set_source_rgba(0.9, 0.93, 0.86, 0.16)
        cr.stroke()

        segment_w = (w - 12) / 3
        labels = ["Weather", "Clocks", "Settings"]
        for idx, label in enumerate(labels):
            active = idx == active_index
            sx = x + 6 + idx * segment_w
            self.round_rect(cr, sx, y + 6, segment_w - 6, h - 12, 6)
            cr.set_source_rgba(0.97, 0.94, 0.86, 1 if active else 0.08)
            cr.fill()
            color = (0.03, 0.07, 0.06) if active else (0.68, 0.72, 0.63)
            self.text(cr, label, sx + segment_w * 0.33, y + 40, 16, color, weight="bold")

    def sun(self, cr, x, y, radius, color):
        cr.set_source_rgb(*color)
        cr.arc(x, y, radius * 0.55, 0, math.tau)
        cr.fill()
        cr.set_line_width(5)
        for idx in range(8):
            angle = idx * math.tau / 8
            cr.move_to(x + math.cos(angle) * radius * 0.9, y + math.sin(angle) * radius * 0.9)
            cr.line_to(x + math.cos(angle) * radius * 1.25, y + math.sin(angle) * radius * 1.25)
        cr.stroke()

    def round_rect(self, cr, x, y, w, h, r):
        cr.new_sub_path()
        cr.arc(x + w - r, y + r, r, -math.pi / 2, 0)
        cr.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
        cr.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
        cr.arc(x + r, y + r, r, math.pi, math.pi * 1.5)
        cr.close_path()

    def text(self, cr, text, x, y, size, color, weight="normal"):
        cr.select_font_face("DejaVu Sans", 0, 1 if weight == "bold" else 0)
        cr.set_font_size(size)
        cr.set_source_rgb(*color)
        cr.move_to(x, y)
        cr.show_text(text)


def cairo_linear(x0, y0, x1, y1):
    import cairo

    return cairo.LinearGradient(x0, y0, x1, y1)


if __name__ == "__main__":
    win = FamilyDisplayDemo()
    win.show_all()
    Gtk.main()
