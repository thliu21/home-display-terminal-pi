#!/usr/bin/env python3
import json
import os
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


BUTTON_PIN = int(os.environ.get("FAMILY_DISPLAY_BUTTON_PIN", "17"))


class ButtonReader:
    def __init__(self, pin):
        self.pin = pin
        self.backend = None
        self.error = None
        self._button = None
        self._setup()

    def _setup(self):
        try:
            from gpiozero import Button

            self._button = Button(self.pin, pull_up=True, bounce_time=0.05)
            self.backend = "gpiozero"
            return
        except Exception as error:
            self.error = f"gpiozero unavailable: {error}"

        try:
            import RPi.GPIO as GPIO

            GPIO.setmode(GPIO.BCM)
            GPIO.setup(self.pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
            self._gpio = GPIO
            self.backend = "RPi.GPIO"
            self.error = None
            return
        except Exception as error:
            self.error = f"GPIO unavailable: {error}"

    def read(self):
        if self.backend == "gpiozero":
            pressed = bool(self._button.is_pressed)
            return {
                "available": True,
                "pin": self.pin,
                "backend": self.backend,
                "pressed": pressed,
                "level": "LOW" if pressed else "HIGH",
            }

        if self.backend == "RPi.GPIO":
            level = int(self._gpio.input(self.pin))
            return {
                "available": True,
                "pin": self.pin,
                "backend": self.backend,
                "pressed": level == 0,
                "level": "LOW" if level == 0 else "HIGH",
            }

        return {
            "available": False,
            "pin": self.pin,
            "backend": None,
            "pressed": False,
            "level": None,
            "error": self.error or "No GPIO backend available",
        }


button_reader = ButtonReader(BUTTON_PIN)


class FamilyDisplayHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?", 1)[0] == "/api/gpio/button":
            self.send_gpio_response()
            return
        super().do_GET()

    def send_gpio_response(self):
        payload = json.dumps(button_reader.read()).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def main():
    host = os.environ.get("FAMILY_DISPLAY_HOST", "127.0.0.1")
    port = int(os.environ.get("FAMILY_DISPLAY_PORT", "3000"))
    server = ThreadingHTTPServer((host, port), FamilyDisplayHandler)
    print(f"Family Display server listening on http://{host}:{port}")
    print(f"GPIO button debug pin: GPIO{BUTTON_PIN}")
    server.serve_forever()


if __name__ == "__main__":
    main()
